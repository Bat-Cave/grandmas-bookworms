"use client";

import { useMutation, useQuery } from "convex/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getParticipantDisplayName } from "@/lib/participants";
import { EmojiSequenceInput } from "@/components/family/emoji-sequence-input";
import { useFamilySession } from "@/components/family/family-session";

export function FamilyGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const account = useQuery(api.accounts.getMyAccount, {});
  const participants = useQuery(api.participants.listMyParticipants, {});
  const { activeParticipantId, isLocked, isParentUnlocked } = useFamilySession();

  if (account === undefined || participants === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }
  if (account === null) return null;
  if (account.type !== "family") return <>{children}</>;

  if (!account.hasParentPasscode) {
    return <ParentPasscodeSetup accountId={account._id} />;
  }

  const needsParentUnlock = pathname.startsWith("/family");

  if (needsParentUnlock && !isParentUnlocked) {
    return <ParentUnlockScreen />;
  }

  if (needsParentUnlock && isParentUnlocked) {
    return <>{children}</>;
  }

  if (isLocked || !activeParticipantId) {
    return isParentUnlocked ? (
      <FamilySwitcher participants={participants} />
    ) : (
      <ParentUnlockScreen />
    );
  }

  return <>{children}</>;
}

function ParentPasscodeSetup({ accountId }: { accountId: Id<"accounts"> }) {
  const setParentPasscode = useMutation(api.accounts.setParentPasscode);
  const [passcode, setPasscode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set a parent passcode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This passcode is required before switching kids or changing family settings.
          </p>
          <div>
            <Label>Parent passcode</Label>
            <Input
              type="password"
              inputMode="numeric"
              placeholder="4-6 digits"
              className="mt-1"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
          </div>
          <div>
            <Label>Confirm passcode</Label>
            <Input
              type="password"
              inputMode="numeric"
              placeholder="Repeat passcode"
              className="mt-1"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            onClick={async () => {
              setError("");
              if (!/^\d{4,6}$/.test(passcode)) {
                setError("Passcode must be 4-6 digits.");
                return;
              }
              if (passcode !== confirm) {
                setError("Passcodes do not match.");
                return;
              }
              setSaving(true);
              try {
                await setParentPasscode({
                  accountId,
                  parentPasscode: passcode,
                });
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to save");
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save passcode"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ParentUnlockScreen() {
  const verifyParentPasscode = useMutation(api.accounts.verifyParentPasscode);
  const { grantParentUnlock } = useFamilySession();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Parent access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please have a parent enter the passcode to continue.
          </p>
          <div>
            <Label>Parent passcode</Label>
            <Input
              type="password"
              inputMode="numeric"
              placeholder="4-6 digits"
              className="mt-1"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            onClick={async () => {
              setError("");
              setLoading(true);
              try {
                const ok = await verifyParentPasscode({ passcode });
                if (!ok) {
                  setError("That passcode did not match.");
                  return;
                }
                grantParentUnlock();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to verify");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            {loading ? "Checking…" : "Unlock"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function FamilySwitcher({
  participants,
}: {
  participants: Array<{
    _id: Id<"participants">;
    firstName?: string;
    lastName?: string;
    role: "owner" | "member";
    unlockType?: "pin" | "emoji";
  }>;
}) {
  const verifyUnlock = useMutation(api.participants.verifyUnlock);
  const { setActiveParticipantId } = useFamilySession();
  const [selected, setSelected] = useState<(typeof participants)[0] | null>(null);
  const [unlockValue, setUnlockValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Select your reader</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {participants.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No participants yet. Add a kid in Family settings.
            </p>
          )}
          {participants.map((p) => (
            <button
              key={p._id}
              type="button"
              className="rounded-lg border p-4 text-left hover:bg-muted"
              onClick={() => {
                setError("");
                setUnlockValue("");
                setSelected(p);
              }}
            >
              <div className="font-medium">{getParticipantDisplayName(p)}</div>
              <p className="text-sm text-muted-foreground">
                {p.role === "owner" ? "Parent" : "Kid"} ·{" "}
                {p.unlockType ? "Quick unlock set" : "Quick unlock missing"}
              </p>
            </button>
          ))}
          <div className="rounded-lg border p-4 text-left bg-muted/30 md:col-span-2">
            <p className="text-sm text-muted-foreground mb-2">
              Need to set or reset a quick unlock?
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/family">Go to Family settings</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick unlock</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {getParticipantDisplayName(selected)}: enter the quick unlock to start.
              </p>
              {!selected.unlockType && (
                <p className="text-sm text-destructive">
                  This reader does not have a quick unlock yet. Ask a parent to set it in Family settings.
                </p>
              )}
              {selected.unlockType === "pin" && (
                <div>
                  <Label>PIN</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    placeholder="4-6 digits"
                    className="mt-1"
                    value={unlockValue}
                    onChange={(e) => setUnlockValue(e.target.value)}
                  />
                </div>
              )}
              {selected.unlockType === "emoji" && (
                <div>
                  <Label>Emoji sequence</Label>
                  <EmojiSequenceInput
                    value={unlockValue}
                    onChange={setUnlockValue}
                  />
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    if (!selected.unlockType) return;
                    setError("");
                    setLoading(true);
                    try {
                      const ok = await verifyUnlock({
                        participantId: selected._id,
                        unlockValue: unlockValue.trim(),
                      });
                      if (!ok) {
                        setError("That didn't match. Try again.");
                        return;
                      }
                      setActiveParticipantId(selected._id);
                      setSelected(null);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Failed to unlock");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !selected.unlockType}
                >
                  {loading ? "Checking…" : "Start"}
                </Button>
                <Button variant="ghost" onClick={() => setSelected(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
