import os
from google import genai
from agents.state import AgentState

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def analyze_root_cause(state: AgentState) -> AgentState:
    anomalies = state.get("anomalies", [])

    if not anomalies:
        state["root_cause"] = "No anomalies detected — system healthy."
        return state

    anomaly_summary = "\n".join([
        f"- {a['metric']} hit {a['value']:.2f}% on resource {a['resource']} at {a['timestamp']}"
        for a in anomalies
    ])

    prompt = (
        "You are a DevOps Root Cause Analysis assistant.\n\n"
        "The following anomalies were detected on an AWS EC2 instance:\n"
        f"{anomaly_summary}\n\n"
        "Context: t3.micro instance, 2 vCPUs, demo DevOps monitoring project.\n\n"
        "Provide:\n"
        "1. A likely root cause (1-2 sentences)\n"
        "2. Confidence level (low/medium/high)\n"
        "3. One recommended next step\n\n"
        "Keep response under 100 words."
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        state["root_cause"] = response.text
    except Exception as e:
        # If Gemini fails (quota/rate limit), use a smart fallback
        error_str = str(e).lower()
        if anomalies:
            worst = max(anomalies, key=lambda a: a['value'])
            state["root_cause"] = (
                f"1. **Likely Root Cause:** CPU spike of {worst['value']:.2f}% detected on {worst['resource']}. "
                f"Likely caused by background processes or monitoring agent activity on the t3.micro instance.\n"
                f"2. **Confidence Level:** Medium\n"
                f"3. **Recommended Next Step:** SSH into the instance and run `top` to identify high-CPU processes. "
                f"Consider switching to unlimited CPU credits mode.\n\n"
                f"_(Note: AI analysis unavailable — {('quota exceeded' if 'quota' in error_str or '429' in error_str else 'API error')}. Using rule-based fallback.)_"
            )
        else:
            state["root_cause"] = "No anomalies detected — system healthy."
    
    return state