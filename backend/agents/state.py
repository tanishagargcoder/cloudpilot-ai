from typing import TypedDict, List, Optional

class AgentState(TypedDict):
    metrics: dict
    anomalies: List[dict]
    root_cause: Optional[str]
    fix_plan: Optional[str]
    report: Optional[str]
    requires_approval: bool