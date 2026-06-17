import os
from google import genai
from agents.state import AgentState

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def analyze_root_cause(state: AgentState) -> AgentState:
    """
    Takes the anomalies found by the detector agent and asks Gemini
    to reason about likely root causes.
    """
    anomalies = state.get("anomalies", [])

    if not anomalies:
        state["root_cause"] = "No anomalies detected — system healthy."
        return state

    anomaly_summary = "\n".join([
        f"- {a['metric']} hit {a['value']:.2f}% on resource {a['resource']} at {a['timestamp']}"
        for a in anomalies
    ])

    prompt = f"""You are a DevOps Root Cause Analysis assistant.

The following anomalies were detected on an AWS EC2 instance running a basic web server:

{anomaly_summary}

Context: This is a t3.micro instance with 2 vCPUs, currently used for a demo
DevOps monitoring project. No production traffic is running on it.

Based on this information, provide:
1. A likely root cause (1-2 sentences)
2. A confidence level (low/medium/high)
3. One recommended next step

Keep your entire response under 100 words."""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    state["root_cause"] = response.text
    return state