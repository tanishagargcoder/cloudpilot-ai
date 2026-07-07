import os
from database import save_incident, get_incidents, save_notification, update_incident_status
from datetime import datetime
import boto3
from datetime import datetime, timedelta
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
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
    "https://cloudpilot-ai-three.vercel.app",
    "*"],
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

    # Save to MongoDB
    from datetime import datetime
    incident = {
        **state,
        "id": f"incident-{int(datetime.utcnow().timestamp() * 1000)}",
        "created_at": datetime.now().isoformat(),
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
        "created_at": datetime.utcnow().isoformat(),
    })
    incident.pop("_id", None)
    return incident

@app.get("/incidents")
def get_all_incidents():
    return get_incidents(limit=20)

@app.post("/incidents/{incident_id}/approve")
def approve_incident(incident_id: str):
    update_incident_status(incident_id, "approved")
    return {"status": "approved"}

@app.post("/incidents/{incident_id}/reject")
def reject_incident(incident_id: str):
    update_incident_status(incident_id, "rejected")
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