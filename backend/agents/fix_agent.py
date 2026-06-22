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
        "- If no infrastructure change is appropriate, say so clearly\n\n"
        "Format your response as:\n"
        "DIAGNOSIS: <one line>\n"
        "TERRAFORM CHANGE: <before/after code or 'None needed'>\n"
        "REASONING: <short explanation>"
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        state["fix_plan"] = response.text

    except Exception as e:
        error_str = str(e).lower()
        anomalies = state.get("anomalies", [])

        if anomalies:
            worst = max(anomalies, key=lambda a: a.get("value", 0))
            cpu_val = worst.get("value", 0)

            if cpu_val > 80:
                fix = (
                    "DIAGNOSIS: High CPU utilization detected — instance may be undersized.\n\n"
                    "TERRAFORM CHANGE:\n"
                    "```diff\n"
                    "- instance_type = \"t3.micro\"\n"
                    "+ instance_type = \"t3.small\"\n"
                    "```\n\n"
                    "REASONING: Upgrading from t3.micro to t3.small doubles available CPU and memory, "
                    "reducing the risk of sustained high CPU and credit exhaustion."
                )
            else:
                fix = (
                    "DIAGNOSIS: Moderate CPU spike — likely burstable credit exhaustion on t3.micro.\n\n"
                    "TERRAFORM CHANGE:\n"
                    "```diff\n"
                    "  resource \"aws_instance\" \"monitored_server\" {\n"
                    "    instance_type = \"t3.micro\"\n"
                    "+   credit_specification {\n"
                    "+     cpu_credits = \"unlimited\"\n"
                    "+   }\n"
                    "  }\n"
                    "```\n\n"
                    "REASONING: Enabling unlimited CPU credits prevents performance throttling "
                    "when the instance exhausts its burst credits during peak activity."
                )
        else:
            fix = (
                "DIAGNOSIS: No critical anomalies detected — system appears stable.\n\n"
                "TERRAFORM CHANGE: None needed\n\n"
                "REASONING: Current infrastructure configuration is appropriate for observed workload."
            )

        quota_note = "\n\n_(Note: AI fix generation unavailable — " + \
            ("quota exceeded" if "quota" in error_str or "429" in error_str else "API error") + \
            ". Using rule-based fallback.)_"

        state["fix_plan"] = fix + quota_note
        state["requires_approval"] = True

    state["requires_approval"] = True
    return state