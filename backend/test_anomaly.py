from dotenv import load_dotenv
load_dotenv()

from agents.anomaly_detector import detect_anomalies

initial_state = {
    "metrics": {},
    "anomalies": [],
    "root_cause": None,
    "fix_plan": None,
    "report": None,
    "requires_approval": False,
}

result = detect_anomalies(initial_state)
print("Anomalies found:", result["anomalies"])
print("Total datapoints checked:", len(result["metrics"]["datapoints"]))

# NEW: print every datapoint's actual value
print("\nAll datapoint values:")
for point in result["metrics"]["datapoints"]:
    print(f"  {point['Timestamp']} → {point['Average']:.2f}%")