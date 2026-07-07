import os
import boto3
from datetime import datetime, timedelta
from agents.state import AgentState

cloudwatch = boto3.client("cloudwatch", region_name=os.getenv("AWS_REGION"))

def detect_anomalies(state: AgentState) -> AgentState:
    """
    Checks EC2 CPU utilization over the last hour.
    Flags an anomaly if average CPU exceeds CPU_ANOMALY_THRESHOLD (default 70%).
    """
    instance_id = os.getenv("EC2_INSTANCE_ID")
    threshold = float(os.getenv("CPU_ANOMALY_THRESHOLD", "70"))

    response = cloudwatch.get_metric_statistics(
        Namespace="AWS/EC2",
        MetricName="CPUUtilization",
        Dimensions=[{"Name": "InstanceId", "Value": instance_id}],
        StartTime=datetime.utcnow() - timedelta(hours=1),
        EndTime=datetime.utcnow(),
        Period=300,
        Statistics=["Average"],
    )

    datapoints = response.get("Datapoints", [])
    print("CloudWatch datapoints:", datapoints)
    anomalies = []

    for point in datapoints:
        if point["Average"] > threshold:
            anomalies.append({
                "metric": "CPUUtilization",
                "value": point["Average"],
                "timestamp": str(point["Timestamp"]),
                "resource": instance_id,
            })

    state["metrics"] = {
    "datapoints": [
        {
            "Average": p["Average"],
            "Timestamp": str(p["Timestamp"])
        }
        for p in datapoints
    ]}
    state["anomalies"] = anomalies
    return state