"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FamilyMemberAddForm } from "@/forms/family-member-add-form";
import { FamilyMemberEditForm } from "@/forms/family-member-edit-form";
import { toUserErrorMessage } from "@/lib/error-messages";
import { getParticipantAgeGroup, getParticipantDisplayName } from "@/lib/participants";
import { EmojiSequenceInput } from "@/components/family/emoji-sequence-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function FamilyPage() {
  const account = useQuery(api.accounts.getMyAccount, {});
  const participants = useQuery(api.participants.listMyParticipants, {});
  const addMember = useMutation(api.participants.addMember);
  const updateParticipant = useMutation(api.participants.updateParticipant);
  const setParentPasscode = useMutation(api.accounts.setParentPasscode);
  const setParticipantUnlock = useMutation(api.participants.setParticipantUnlock);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<Id<"participants"> | null>(null);
  const [passcode, setPasscode] = useState("");
  const [passcodeConfirm, setPasscodeConfirm] = useState("");
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [savingPasscode, setSavingPasscode] = useState(false);
  const [unlockingParticipant, setUnlockingParticipant] = useState<{
    _id: Id<"participants">;
    firstName?: string;
    lastName?: string;
    role: "owner" | "member";
    unlockType?: "pin" | "emoji";
  } | null>(null);
  const [unlockType, setUnlockType] = useState<"pin" | "emoji">("pin");
  const [unlockValue, setUnlockValue] = useState("");
  const [unlockPasscode, setUnlockPasscode] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [savingUnlock, setSavingUnlock] = useState(false);

  if (account === undefined || participants === undefined) {
    return <p className="text-muted-foreground">Loading...</p>;
  }
  if (account === null) return null;
  if (account.type !== "family") {
    return (
      <div>
        <p className="text-muted-foreground">
          Family management is only for family accounts. You have an individual account.
        </p>
      </div>
    );
  }

  const handleAdd = async (values: {
    firstName: string;
    lastName: string;
    birthday: string;
    unlockType: "pin" | "emoji";
    unlockValue: string;
  }) => {
    setAdding(true);
    try {
      await addMember({
        accountId: account._id,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        birthday: values.birthday.trim(),
        unlockType: values.unlockType,
        unlockValue: values.unlockValue.trim(),
      });
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (p: (typeof participants)[0]) => setEditingId(p._id);

  const handleSaveEdit = async (values: { firstName: string; lastName: string; birthday: string }) => {
    if (!editingId) return;
    await updateParticipant({
      participantId: editingId,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      birthday: values.birthday.trim(),
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Family</h1>

      <Card>
        <CardHeader>
          <CardTitle>Parent passcode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-sm">
          <p className="text-sm text-muted-foreground">
            Required before switching kids or changing family settings.
          </p>
          <div>
            <Label>Passcode</Label>
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
              value={passcodeConfirm}
              onChange={(e) => setPasscodeConfirm(e.target.value)}
            />
          </div>
          {passcodeError && (
            <p className="text-sm text-destructive">{passcodeError}</p>
          )}
          <Button
            onClick={async () => {
              setPasscodeError(null);
              if (!/^\d{4,6}$/.test(passcode)) {
                setPasscodeError("Passcode must be 4-6 digits.");
                return;
              }
              if (passcode !== passcodeConfirm) {
                setPasscodeError("Passcodes do not match.");
                return;
              }
              setSavingPasscode(true);
              try {
                await setParentPasscode({
                  accountId: account._id,
                  parentPasscode: passcode,
                });
                setPasscode("");
                setPasscodeConfirm("");
              } catch (err) {
                setPasscodeError(toUserErrorMessage(err, "Failed to save"));
              } finally {
                setSavingPasscode(false);
              }
            }}
            disabled={savingPasscode}
          >
            {savingPasscode ? "Saving…" : account.hasParentPasscode ? "Update passcode" : "Set passcode"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add a kid</CardTitle>
        </CardHeader>
        <CardContent>
          <FamilyMemberAddForm loading={adding} onSubmit={handleAdd} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {participants.map((p) => (
              <li key={p._id} className="flex items-center justify-between border-b pb-4 last:border-0">
                {editingId === p._id ? (
                  <FamilyMemberEditForm
                    defaultValues={{
                      firstName: p.firstName ?? "",
                      lastName: p.lastName ?? "",
                      birthday: p.birthday ?? "",
                    }}
                    onCancel={() => setEditingId(null)}
                    onSubmit={handleSaveEdit}
                  />
                ) : (
                  <>
                    <div>
                      <span className="font-medium">
                        {getParticipantDisplayName(p)}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {getParticipantAgeGroup(p)}
                        {p.birthday && ` · ${p.birthday}`}
                      </span>
                      {p.role === "owner" && (
                        <span className="text-muted-foreground text-sm ml-2">(you)</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {p.role !== "owner" && (
                        <Button variant="outline" size="sm" onClick={() => startEdit(p)}>
                          Edit
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUnlockingParticipant(p);
                          setUnlockType(p.unlockType ?? "pin");
                          setUnlockValue("");
                          setUnlockPasscode("");
                          setUnlockError(null);
                        }}
                      >
                        Set quick unlock
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Dialog
        open={!!unlockingParticipant}
        onOpenChange={(open) => !open && setUnlockingParticipant(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set quick unlock</DialogTitle>
          </DialogHeader>
          {unlockingParticipant && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set a quick unlock for {getParticipantDisplayName(unlockingParticipant)}.
              </p>
              <div>
                <Label>Unlock type</Label>
                <div className="mt-2 flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="pin"
                      checked={unlockType === "pin"}
                      onChange={() => setUnlockType("pin")}
                      className="h-4 w-4"
                    />
                    <span>PIN</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="emoji"
                      checked={unlockType === "emoji"}
                      onChange={() => setUnlockType("emoji")}
                      className="h-4 w-4"
                    />
                    <span>Emoji</span>
                  </label>
                </div>
              </div>
              {unlockType === "pin" ? (
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
              ) : (
                <div>
                  <Label>Emoji sequence</Label>
                  <EmojiSequenceInput value={unlockValue} onChange={setUnlockValue} />
                </div>
              )}
              <div>
                <Label>Parent passcode</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="Enter parent passcode"
                  className="mt-1"
                  value={unlockPasscode}
                  onChange={(e) => setUnlockPasscode(e.target.value)}
                />
              </div>
              {unlockError && (
                <p className="text-sm text-destructive">{unlockError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    if (!unlockingParticipant) return;
                    setUnlockError(null);
                    if (unlockType === "pin" && !/^\d{4,6}$/.test(unlockValue)) {
                      setUnlockError("PIN must be 4-6 digits.");
                      return;
                    }
                    if (unlockType === "emoji" && unlockValue.split("-").filter(Boolean).length < 3) {
                      setUnlockError("Pick at least 3 emojis.");
                      return;
                    }
                    setSavingUnlock(true);
                    try {
                      await setParticipantUnlock({
                        participantId: unlockingParticipant._id,
                        parentPasscode: unlockPasscode,
                        unlockType,
                        unlockValue: unlockValue.trim(),
                      });
                      setUnlockingParticipant(null);
                    } catch (err) {
                      setUnlockError(toUserErrorMessage(err, "Failed to save"));
                    } finally {
                      setSavingUnlock(false);
                    }
                  }}
                  disabled={savingUnlock}
                >
                  {savingUnlock ? "Saving…" : "Save"}
                </Button>
                <Button variant="ghost" onClick={() => setUnlockingParticipant(null)}>
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
