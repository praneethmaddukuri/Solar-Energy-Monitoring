import React, { useState } from "react";
import { Sun, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import api from "../utils/api";
import { toast } from "sonner";

const ConnectThingSpeak = () => {
  const navigate = useNavigate();
  const [channelId, setChannelId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/user/connect", {
        channel_id: channelId,
        api_key: apiKey,
      });

      toast.success("ThingSpeak Connected Successfully");
      navigate("/");
    } catch (error) {
      toast.error("Connection failed. Check your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500 mb-4 shadow-lg">
            <Sun className="w-10 h-10 text-white" />
          </div>
          <h1
            className="text-3xl font-bold text-slate-900"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Connect ThingSpeak
          </h1>
          <p className="text-slate-600 mt-2">
            Enter your Channel ID and Read API Key
          </p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle>ThingSpeak Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Channel ID</Label>
                <Input
                  placeholder="Enter Channel ID"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label>Read API Key</Label>
                <Input
                  placeholder="Enter Read API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                disabled={loading}
              >
                {loading ? "Connecting..." : "Connect"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate("/auth")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConnectThingSpeak;