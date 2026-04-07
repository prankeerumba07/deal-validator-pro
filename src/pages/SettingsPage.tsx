import { useState, useEffect } from "react";
import { useDealContext } from "@/context/DealContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const SettingsPage = () => {
  const { settings, updateSettings } = useDealContext();
  const [local, setLocal] = useState({
    price_tolerance: 50,
    validation_frequency: "30min",
    retry_attempts: 3,
    coupon_validation_enabled: true,
    email_alerts_enabled: true,
    slack_alerts_enabled: false,
  });

  useEffect(() => {
    if (settings) {
      setLocal({
        price_tolerance: settings.price_tolerance,
        validation_frequency: settings.validation_frequency,
        retry_attempts: settings.retry_attempts,
        coupon_validation_enabled: settings.coupon_validation_enabled,
        email_alerts_enabled: settings.email_alerts_enabled,
        slack_alerts_enabled: settings.slack_alerts_enabled,
      });
    }
  }, [settings]);

  const update = (patch: Partial<typeof local>) => setLocal(prev => ({ ...prev, ...patch }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader><CardTitle>Validation Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Price Tolerance (₹)</Label>
              <Input type="number" value={local.price_tolerance} onChange={e => update({ price_tolerance: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Retry Attempts</Label>
              <Input type="number" value={local.retry_attempts} onChange={e => update({ retry_attempts: Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Validation Frequency</Label>
            <Select value={local.validation_frequency} onValueChange={v => update({ validation_frequency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15min">Every 15 minutes</SelectItem>
                <SelectItem value="30min">Every 30 minutes</SelectItem>
                <SelectItem value="1hr">Every 1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Coupon Settings</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>Enable Coupon Validation</Label>
            <Switch checked={local.coupon_validation_enabled} onCheckedChange={v => update({ coupon_validation_enabled: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notification Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Email Alerts</Label>
            <Switch checked={local.email_alerts_enabled} onCheckedChange={v => update({ email_alerts_enabled: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Slack Alerts</Label>
            <Switch checked={local.slack_alerts_enabled} onCheckedChange={v => update({ slack_alerts_enabled: v })} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={async () => { await updateSettings(local); toast.success("Settings saved"); }}>Save Settings</Button>
    </div>
  );
};

export default SettingsPage;
