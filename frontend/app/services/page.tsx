"use client";

import { useEffect, useState } from "react";
import {
  Server,
  Activity,
  Cloud,
  Zap,
  CheckCircle,
  XCircle,
} from "lucide-react";

type ServiceHealth = {
  status: string;
  state?: string;
};

export default function ServicesPage() {
  const [services, setServices] = useState<Record<string, ServiceHealth>>({});

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/health`)
      .then((r) => r.json())
      .then(setServices)
      .catch(console.error);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "connected":
        return "text-emerald-400";
      case "degraded":
        return "text-amber-400";
      default:
        return "text-red-400";
    }
  };

  const cards = [
    {
      key: "ec2",
      title: "EC2",
      icon: Server,
    },
    {
      key: "lambda",
      title: "Lambda",
      icon: Zap,
    },
    {
      key: "cloudwatch",
      title: "CloudWatch",
      icon: Activity,
    },
    {
      key: "slack",
      title: "Slack",
      icon: Cloud,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">
          Service Health
        </h1>
        <p className="text-slate-500 mt-1">
          Real-time AWS infrastructure status
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const service = services[card.key];
          const Icon = card.icon;

          return (
            <div
              key={card.key}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-slate-400" />

                {service?.status === "healthy" ||
                service?.status === "connected" ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400" />
                )}
              </div>

              <h3 className="mt-4 text-lg font-semibold">
                {card.title}
              </h3>

              <p
                className={`mt-2 text-sm capitalize ${getStatusColor(
                  service?.status || "offline"
                )}`}
              >
                {service?.status || "offline"}
              </p>

              {service?.state && (
                <p className="text-xs text-slate-500 mt-1">
                  {service.state}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}