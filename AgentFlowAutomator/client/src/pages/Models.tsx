import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { models } from "@/hooks/lib/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Zap, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export default function Models() {
  return (
    <div className="min-h-screen flex">
      <Sidebar />

      <main className="main-content flex-1">
        <Header title="AI Models" />

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search models..." className="pl-9" />
            </div>
            <Button className="gap-2 text-white">
              <Plus className="h-4 w-4" /> Fine-tune New Model
            </Button>
          </div>

          {/* Models List */}
          <div className="grid grid-cols-1 gap-6">
            {models.map((model, idx) => (
              <Card
                key={idx}
                className="hover:shadow-md transition-shadow border-muted/60"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`mt-1 h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 
                        ${
                          model.provider === "OpenAI"
                            ? "bg-emerald-100 text-emerald-700"
                            : model.provider === "Anthropic"
                              ? "bg-rose-100 text-rose-700"
                              : model.provider === "Mistral"
                                ? "bg-yellow-50 text-yellow-600"
                                : "bg-purple-50 text-purple-600"
                        }`}
                      >
                        <Zap className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-xl text-foreground">
                            {model.name}
                          </h3>
                          <Badge variant="outline" className="bg-muted/50">
                            {model.provider}
                          </Badge>
                          {model.status === "Compliant" && (
                            <Badge
                              variant="default"
                              className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200"
                            >
                              Compliant
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-6 text-sm text-muted-foreground mt-2">
                          <span>
                            Version:{" "}
                            <span className="font-medium text-foreground">
                              {model.version}
                            </span>
                          </span>
                          <span>
                            Context Window:{" "}
                            <span className="font-medium text-foreground">
                              {model.context}
                            </span>
                          </span>
                          <span>
                            Type:{" "}
                            <span className="font-medium text-foreground">
                              {model.type}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 min-w-[200px]">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">
                          Performance Score
                        </span>
                        <span className="font-medium">98%</span>
                      </div>
                      <Progress value={98} className="h-2" />

                      <div className="flex justify-end gap-2 mt-2">
                        <Button variant="outline" size="sm">
                          Evaluate
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
