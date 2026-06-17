import os
from google import genai
from agents.state import AgentState

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def generate_fix(state: AgentState) -> AgentState:
    root_cause = state.get("root_cause", "")

    if not root_cause or "No anomalies detected" in root_cause:
        state["fix_plan"] = "No fix needed — system healthy."
        state["requires_approval"] = False
        return state

    terraform_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "infra", "main.tf"
    )

    try:
        with open(terraform_path, "r") as f:
            terraform_content = f.read()
    except FileNotFoundError:
        terraform_content = "(Terraform file not found - provide a generic fix)"

    prompt = (
        "You are a DevOps engineer who writes Terraform fixes.\n\n"
        "Root cause analysis from a previous step:\n"
        f"{root_cause}\n\n"
        "Current Terraform configuration for the affected EC2 instance:\n"
        f"{terraform_content}\n\n"
        "Based on the root cause, suggest a SPECIFIC Terraform code change to address this issue.\n"
        "Rules:\n"
        "- Only suggest changes to existing resources, don't invent new unrelated ones\n"
        "- Show the exact line(s) to change, with before/after\n"
        "- Keep your explanation under 80 words\n"
        "- If no infrastructure change is appropriate, say so clearly instead of forcing a Terraform change\n\n"
        "Format your response as:\n"
        "DIAGNOSIS: <one line>\n"
        "TERRAFORM CHANGE: <before/after code or 'None needed'>\n"
        "REASONING: <short explanation>"
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    state["fix_plan"] = response.text
    state["requires_approval"] = True
    return state