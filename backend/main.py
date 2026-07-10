import os
import requests
from database import save_incident, get_incidents, save_notification, update_incident_status
from datetime import datetime
import boto3
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from agents.anomaly_detector import detect_anomalies
from agents.rca_agent import analyze_root_cause
from agents.fix_agent import generate_fix
from agents.report_writer import write_report

app = FastAPI(title="CloudPilot AI - DevOps Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",
    "https://cloudpilot-ai-three.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cloudwatch = boto3.client("cloudwatch", region_name=os.getenv("AWS_REGION"))


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "CloudPilot AI backend is running"}


@app.get("/metrics/ec2-cpu")
def get_ec2_cpu():
    response = cloudwatch.get_metric_statistics(
        Namespace="AWS/EC2",
        MetricName="CPUUtilization",
        Dimensions=[
            {"Name": "InstanceId", "Value": os.getenv("EC2_INSTANCE_ID")}
        ],
        StartTime=datetime.utcnow() - timedelta(hours=1),
        EndTime=datetime.utcnow(),
        Period=300,
        Statistics=["Average"],
    )
    datapoints = response.get("Datapoints", [])
    return {"instance_id": os.getenv("EC2_INSTANCE_ID"), "datapoints": datapoints}

@app.get("/metrics/ec2-network")
def get_ec2_network():
    def series(metric_name):
        response = cloudwatch.get_metric_statistics(
            Namespace="AWS/EC2",
            MetricName=metric_name,
            Dimensions=[
                {"Name": "InstanceId", "Value": os.getenv("EC2_INSTANCE_ID")}
            ],
            StartTime=datetime.utcnow() - timedelta(hours=1),
            EndTime=datetime.utcnow(),
            Period=300,
            Statistics=["Average"],
        )
        return sorted(response.get("Datapoints", []), key=lambda d: d["Timestamp"])

    return {
        "instance_id": os.getenv("EC2_INSTANCE_ID"),
        "inbound": series("NetworkIn"),
        "outbound": series("NetworkOut"),
    }


@app.get("/metrics/ec2-memory")
def get_ec2_memory():
    # Memory needs the CloudWatch agent on the instance (CWAgent namespace).
    # Returns empty datapoints if the agent isn't installed.
    try:
        response = cloudwatch.get_metric_statistics(
            Namespace="CWAgent",
            MetricName="mem_used_percent",
            Dimensions=[
                {"Name": "InstanceId", "Value": os.getenv("EC2_INSTANCE_ID")}
            ],
            StartTime=datetime.utcnow() - timedelta(hours=1),
            EndTime=datetime.utcnow(),
            Period=300,
            Statistics=["Average"],
        )
        datapoints = sorted(response.get("Datapoints", []), key=lambda d: d["Timestamp"])
        return {"instance_id": os.getenv("EC2_INSTANCE_ID"), "datapoints": datapoints}
    except Exception as e:
        return {"instance_id": os.getenv("EC2_INSTANCE_ID"), "datapoints": [], "error": str(e)}


@app.get("/services/health")
def get_services_health():
    services = {
        "ec2": {"status": "unknown"},
        "cloudwatch": {"status": "unknown"},
        "lambda": {"status": "unknown"},
        "slack": {"status": "unknown"},
    }

    try:
        ec2 = boto3.client("ec2", region_name=os.getenv("AWS_REGION"))

        instance_id = os.getenv("EC2_INSTANCE_ID")

        response = ec2.describe_instance_status(
            InstanceIds=[instance_id],
            IncludeAllInstances=True
        )

        if response["InstanceStatuses"]:
            state = response["InstanceStatuses"][0]["InstanceState"]["Name"]

            services["ec2"] = {
                "status": "healthy" if state == "running" else "degraded",
                "state": state
            }
    except Exception as e:
        services["ec2"] = {
            "status": "offline",
            "error": str(e)
        }

    try:
        cloudwatch.list_metrics
        services["cloudwatch"] = {"status": "healthy"}
    except Exception as e:
        services["cloudwatch"] = {
            "status": "offline",
            "error": str(e)
        }

    try:
        lambda_client = boto3.client(
            "lambda",
            region_name=os.getenv("AWS_REGION", "ap-south-1")
        )

        lambda_client.list_functions(MaxItems=1)

        services["lambda"] = {"status": "healthy"}
    except Exception as e:
        services["lambda"] = {
            "status": "offline",
            "error": str(e)
        }

    services["slack"] = {
        "status": "connected"
            if os.getenv("SLACK_WEBHOOK_URL")
            else "offline"
    }

    return services


@app.post("/run-agent")
def run_agent():
    state = {
        "metrics": {},
        "anomalies": [],
        "root_cause": None,
        "fix_plan": None,
        "report": None,
        "requires_approval": False,
    }
    state = detect_anomalies(state)
    state = analyze_root_cause(state)
    state = generate_fix(state)
    state = write_report(state)

    # Save to MongoDB (datetime already imported at module level)
    incident = {
        **state,
        "id": f"incident-{int(datetime.utcnow().timestamp() * 1000)}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "needs_approval" if state["requires_approval"] else "healthy",
        "anomalies": state.get("anomalies", []),
    }
    save_incident(incident)

    # Save notification
    save_notification({
        "id": f"notif-{int(datetime.utcnow().timestamp() * 1000)}",
        "title": "Approval Required" if state["requires_approval"] else "New Incident",
        "message": f"{incident['id']} detected",
        "severity": "warning" if state["requires_approval"] else "critical",
        "time": datetime.now().strftime("%d %b, %I:%M %p"),
        "read": False,
        "type": "approval" if state["requires_approval"] else "incident",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    incident.pop("_id", None)
    return incident

DEMO_COST_RECS = [
    {"type": "EC2 Instance", "resource": "i-0b3f2a91c4e7d8f01", "issue": "CPU below 5% for 14 days (idle worker)",
     "action": "Downsize t3.medium to t3.small", "monthly_savings": 15.18, "severity": "high"},
    {"type": "EBS Volume", "resource": "vol-0f2a9c13b7e64d215", "issue": "Unattached 100 GB gp3 volume",
     "action": "Snapshot and delete the volume", "monthly_savings": 8.00, "severity": "medium"},
    {"type": "Elastic IP", "resource": "eipalloc-09d13c2ab8f7e6d41", "issue": "Not associated with any instance",
     "action": "Release the unused address", "monthly_savings": 3.65, "severity": "low"},
    {"type": "RDS Database", "resource": "db-reports-dev", "issue": "No connections in the last 30 days",
     "action": "Stop or delete the dev database", "monthly_savings": 24.82, "severity": "high"},
]


@app.get("/cost/recommendations")
def cost_recommendations(demo: bool = False):
    recs = []
    simulated = demo
    if not demo:
        try:
            ec2 = boto3.client("ec2", region_name=os.getenv("AWS_REGION", "ap-south-1"))

            volumes = ec2.describe_volumes(
                Filters=[{"Name": "status", "Values": ["available"]}]
            )["Volumes"]
            for v in volumes:
                recs.append({
                    "type": "EBS Volume", "resource": v["VolumeId"],
                    "issue": f"Unattached {v['Size']} GB volume",
                    "action": "Snapshot and delete the volume",
                    "monthly_savings": round(v["Size"] * 0.08, 2),
                    "severity": "medium",
                })

            for a in ec2.describe_addresses()["Addresses"]:
                if "AssociationId" not in a:
                    recs.append({
                        "type": "Elastic IP", "resource": a.get("AllocationId", a.get("PublicIp", "unknown")),
                        "issue": "Not associated with any instance",
                        "action": "Release the unused address",
                        "monthly_savings": 3.65,
                        "severity": "low",
                    })

            stopped = ec2.describe_instances(
                Filters=[{"Name": "instance-state-name", "Values": ["stopped"]}]
            )
            for r in stopped["Reservations"]:
                for i in r["Instances"]:
                    recs.append({
                        "type": "EC2 Instance", "resource": i["InstanceId"],
                        "issue": "Stopped instance still incurs EBS storage cost",
                        "action": "Create an AMI and terminate, or restart if needed",
                        "monthly_savings": 8.00,
                        "severity": "medium",
                    })
        except Exception as e:
            print(f"Cost scan failed, using demo data: {e}")
            simulated = True

    if simulated:
        recs = DEMO_COST_RECS

    total = round(sum(r["monthly_savings"] for r in recs), 2)
    return {
        "simulated": simulated,
        "total_monthly_savings": total,
        "recommendations": recs,
        "scanned_at": datetime.now(timezone.utc).isoformat(),
    }


DEMO_SECURITY_FINDINGS = [
    {"category": "S3 Bucket", "resource": "cloudpilot-public-assets", "issue": "Bucket allows public read access",
     "recommendation": "Enable Block Public Access unless static hosting is required", "severity": "critical"},
    {"category": "Security Group", "resource": "sg-0a1b2c3d4e5f6a7b8", "issue": "Port 22 (SSH) open to the world (0.0.0.0/0)",
     "recommendation": "Restrict SSH to your IP or use SSM Session Manager", "severity": "critical"},
    {"category": "IAM", "resource": "user/deploy-bot", "issue": "User has no MFA device configured",
     "recommendation": "Enable MFA for all IAM users", "severity": "medium"},
    {"category": "IAM", "resource": "role/legacy-admin", "issue": "Role has AdministratorAccess policy attached",
     "recommendation": "Apply least-privilege permissions", "severity": "medium"},
]


@app.get("/security/findings")
def security_findings(demo: bool = False):
    findings = []
    checks_run = 0
    simulated = demo

    if not demo:
        region = os.getenv("AWS_REGION", "ap-south-1")

        try:
            ec2 = boto3.client("ec2", region_name=region)
            for sg in ec2.describe_security_groups()["SecurityGroups"]:
                for perm in sg.get("IpPermissions", []):
                    for ip in perm.get("IpRanges", []):
                        if ip.get("CidrIp") == "0.0.0.0/0":
                            port = perm.get("FromPort")
                            sensitive = port in (22, 3389, 3306, 5432, 27017)
                            findings.append({
                                "category": "Security Group",
                                "resource": sg["GroupId"],
                                "issue": f"Port {port if port is not None else 'ALL'} open to the world (0.0.0.0/0)",
                                "recommendation": "Restrict to a specific IP range or VPN CIDR",
                                "severity": "critical" if sensitive else "medium",
                            })
            checks_run += 1
        except Exception as e:
            print(f"Security group check failed: {e}")

        try:
            s3 = boto3.client("s3", region_name=region)
            for bucket in s3.list_buckets()["Buckets"][:10]:
                name = bucket["Name"]
                try:
                    pab = s3.get_public_access_block(Bucket=name)["PublicAccessBlockConfiguration"]
                    if not all(pab.values()):
                        findings.append({
                            "category": "S3 Bucket", "resource": name,
                            "issue": "Public access is not fully blocked",
                            "recommendation": "Enable all four Block Public Access settings",
                            "severity": "critical",
                        })
                except Exception:
                    findings.append({
                        "category": "S3 Bucket", "resource": name,
                        "issue": "No Public Access Block configuration found",
                        "recommendation": "Configure Block Public Access for this bucket",
                        "severity": "medium",
                    })
            checks_run += 1
        except Exception as e:
            print(f"S3 check failed: {e}")

        try:
            iam = boto3.client("iam")
            summary = iam.get_account_summary()["SummaryMap"]
            if summary.get("AccountMFAEnabled", 1) == 0:
                findings.append({
                    "category": "IAM", "resource": "root account",
                    "issue": "Root account has no MFA enabled",
                    "recommendation": "Enable MFA on the root account immediately",
                    "severity": "critical",
                })
            checks_run += 1
        except Exception as e:
            print(f"IAM check failed: {e}")

        if checks_run == 0:
            simulated = True

    if simulated:
        findings = DEMO_SECURITY_FINDINGS
        checks_run = 3

    weights = {"critical": 15, "medium": 7, "low": 3}
    score = max(0, 100 - sum(weights.get(f["severity"], 5) for f in findings))
    return {
        "simulated": simulated,
        "score": score,
        "checks_run": checks_run,
        "findings": findings,
        "scanned_at": datetime.now(timezone.utc).isoformat(),
    }


class ChatRequest(BaseModel):
    message: str
    context: str = ""


@app.post("/chat")
def chat(req: ChatRequest):
    # Gemini key stays server-side (GEMINI_API_KEY env var) — never exposed to the browser
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"reply": None, "error": "GEMINI_API_KEY not configured on server"}

    prompt = f"""You are CloudPilot AI, a friendly and intelligent DevOps assistant embedded in a cloud monitoring dashboard.

{req.context}

You can answer ANY question — DevOps, cloud computing, AI, programming, general knowledge, or friendly conversation. Keep answers concise (under 150 words unless more detail is needed). Use bullet points for lists. Be warm and helpful.

User question: {req.message}"""

    try:
        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}",
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.7, "maxOutputTokens": 400},
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        reply = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text")
        )
        return {"reply": reply or "Sorry, I couldn't get a response. Please try again."}
    except Exception as e:
        return {"reply": None, "error": str(e)}


@app.get("/incidents")
def get_all_incidents():
    return get_incidents(limit=20)

def notify_slack(text: str):
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    if webhook_url:
        try:
            requests.post(webhook_url, json={"text": text}, timeout=10)
        except Exception as e:
            print(f"Slack notification failed: {e}")


@app.post("/incidents/{incident_id}/approve")
def approve_incident(incident_id: str):
    update_incident_status(incident_id, "approved")
    notify_slack(f"✅ *Fix Approved & Deployed* — incident `{incident_id}` remediation was approved by a human operator.")
    return {"status": "approved"}

@app.post("/incidents/{incident_id}/reject")
def reject_incident(incident_id: str):
    update_incident_status(incident_id, "rejected")
    notify_slack(f"❌ *Fix Rejected* — incident `{incident_id}` remediation was rejected by a human operator.")
    return {"status": "rejected"}

@app.get("/notifications")
def get_all_notifications():
    from database import get_notifications
    return get_notifications(limit=50)

@app.get("/ping")
def ping():
    return {"pong": True}
@app.get("/")
def root():
    return {"message": "CloudPilot AI Backend", "status": "running", "docs": "/docs"}
@app.websocket("/ws/events")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_json({"event": "connected", "message": "Welcome to CloudPilot AI live feed"})

    try:
        while True:
            data = await websocket.receive_text()

            if data == "run_agent":
                state = {
                    "metrics": {},
                    "anomalies": [],
                    "root_cause": None,
                    "fix_plan": None,
                    "report": None,
                    "requires_approval": False,
                }

                await websocket.send_json({"event": "agent_start", "agent": "anomaly_detector"})
                state = detect_anomalies(state)
                await websocket.send_json({
                    "event": "agent_complete",
                    "agent": "anomaly_detector",
                    "result": {"anomalies": state["anomalies"]}
                })

                await websocket.send_json({"event": "agent_start", "agent": "rca_agent"})
                state = analyze_root_cause(state)
                await websocket.send_json({
                    "event": "agent_complete",
                    "agent": "rca_agent",
                    "result": {"root_cause": state["root_cause"]}
                })

                await websocket.send_json({"event": "agent_start", "agent": "fix_agent"})
                state = generate_fix(state)
                await websocket.send_json({
                    "event": "agent_complete",
                    "agent": "fix_agent",
                    "result": {
                        "fix_plan": state["fix_plan"],
                        "requires_approval": state["requires_approval"]
                    }
                })

                await websocket.send_json({"event": "agent_start", "agent": "report_writer"})
                state = write_report(state)
                await websocket.send_json({
                    "event": "agent_complete",
                    "agent": "report_writer",
                    "result": {"report": state["report"]}
                })

                await websocket.send_json({"event": "pipeline_complete", "final_state": state})

            else:
                await websocket.send_json({"event": "echo", "message": data})

    except Exception as e:
        print(f"WebSocket error: {e}")