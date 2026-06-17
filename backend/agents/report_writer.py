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

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    report_text = response.text
    state["report"] = report_text

    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    if webhook_url:
        try:
            requests.post(webhook_url, json={"text": report_text}, timeout=10)
        except Exception as e:
            print(f"Slack notification failed: {e}")

    return state