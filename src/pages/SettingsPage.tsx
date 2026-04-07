import { useState } from "react";
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
  const [local, setLocal] = useState(settings);

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
              <Input type="number" value={local.priceTolerance} onChange={e => update({ priceTolerance: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Retry Attempts</Label>
              <Input type="number" value={local.retryAttempts} onChange={e => update({ retryAttempts: Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Validation Frequency</Label>
            <Select value={local.validationFrequency} onValueChange={v => update({ validationFrequency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15 min">Every 15 minutes</SelectItem>
                <SelectItem value="30 min">Every 30 minutes</SelectItem>
                <SelectItem value="1 hour">Every 1 hour</SelectItem>
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
            <Switch checked={local.enableCouponValidation} onCheckedChange={v => update({ enableCouponValidation: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notification Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Email Alerts</Label>
            <Switch checked={local.emailAlerts} onCheckedChange={v => update({ emailAlerts: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Slack Alerts</Label>
            <Switch checked={local.slackAlerts} onCheckedChange={v => update({ slackAlerts: v })} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => { updateSettings(local); toast.success("Settings saved"); }}>Save Settings</Button>
    </div>
  );
};

export default SettingsPage;
