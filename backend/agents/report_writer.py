import os
import requests
from google import genai
from agents.state import AgentState

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def write_report(state: AgentState) -> AgentState:
    anomalies = state.get("anomalies", [])

    if not anomalies:
        state["report"] = "No incident — system healthy. No report generated."
        return state

    root_cause = state.get("root_cause", "Unknown")
    fix_plan = state.get("fix_plan", "No fix generated")

    prompt = (
        "You are writing a short incident report for a Slack channel.\n\n"
        f"Anomalies detected: {anomalies}\n\n"
        f"Root cause analysis: {root_cause}\n\n"
        f"Suggested fix: {fix_plan}\n\n"
        "Write a concise incident report with these sections:\n"
        "- Title (one line, with an emoji)\n"
        "- What happened (2 sentences max)\n"
        "- Root cause (1 sentence)\n"
        "- Recommended fix (1 sentence, mention it needs human approval)\n\n"
        "Keep the entire report under 120 words. Use Slack-friendly formatting "
        "with *bold* for headers, no markdown headers (#)."
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        report_text = response.text

    except Exception as e:
        error_str = str(e).lower()

        # Smart rule-based fallback report
        anomaly_count = len(anomalies)
        worst = max(anomalies, key=lambda a: a.get("value", 0)) if anomalies else {}
        cpu_val = worst.get("value", 0)
        resource = worst.get("resource", "EC2 instance")
        timestamp = worst.get("timestamp", "recently")

        report_text = (
            f"🚨 *CPU Spike Detected on {resource}*\n\n"
            f"*What happened:* {anomaly_count} CPU anomal{'y' if anomaly_count == 1 else 'ies'} "
            f"detected, peaking at {cpu_val:.2f}% at {timestamp}. "
            f"This exceeds the normal baseline for this t3.micro instance.\n\n"
            f"*Root cause:* {root_cause.split(chr(10))[0].replace('**', '').replace('*', '').strip()}\n\n"
            f"*Recommended fix:* A Terraform remediation plan has been generated and "
            f"is awaiting human approval before deployment.\n\n"
            f"_({'Quota exceeded' if 'quota' in error_str or '429' in error_str else 'API error'} "
            f"— rule-based report generated.)_"
        )

    state["report"] = report_text

    # Send to Slack regardless of whether AI or fallback was used
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    if webhook_url:
        try:
            requests.post(webhook_url, json={"text": report_text}, timeout=10)
        except Exception as slack_err:
            print(f"Slack notification failed: {slack_err}")

    return state