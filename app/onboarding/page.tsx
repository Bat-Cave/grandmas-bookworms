"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingAccountForm } from "@/forms/onboarding-account-form";
import { OnboardingOwnerForm } from "@/forms/onboarding-owner-form";
import { OnboardingKidsForm } from "@/forms/onboarding-kids-form";
import { toUserErrorMessage } from "@/lib/error-messages";

type AccountType = "individual" | "family";

export default function OnboardingPage() {
  const router = useRouter();
  const membership = useQuery(api.organizations.getMyMembership, {});
  const account = useQuery(api.accounts.getMyAccount, {});
  const createAccount = useMutation(api.accounts.createAccount);
  const createOwnerParticipant = useMutation(
    api.participants.createOwnerParticipant
  );
  const addMember = useMutation(api.participants.addMember);

  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType | "">("");
  const [displayName, setDisplayName] = useState("");
  const [parentPasscode, setParentPasscode] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [ownerBirthday, setOwnerBirthday] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAccountId, setCreatedAccountId] = useState<Id<"accounts"> | null>(null);

  useEffect(() => {
    if (membership === null) {
      router.replace("/join");
      return;
    }
    if (account !== undefined && account !== null) {
      router.replace("/dashboard");
    }
  }, [membership, account, router]);

  if (membership === undefined || account === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }
  if (membership === null || account !== null) {
    return null;
  }

  const handleStep1 = (values: {
    accountType: AccountType | "";
    displayName: string;
    parentPasscode?: string;
  }) => {
    setError(null);
    setAccountType(values.accountType);
    setDisplayName(values.displayName);
    setParentPasscode(values.parentPasscode?.trim() ?? "");
    setStep(2);
  };

  const handleStep2 = async (values: { ownerFirstName: string; ownerLastName: string; ownerBirthday: string }) => {
    setError(null);
    if (!accountType || !displayName.trim()) {
      setError("Please complete step 1 first.");
      return;
    }
    setOwnerFirstName(values.ownerFirstName);
    setOwnerLastName(values.ownerLastName);
    setOwnerBirthday(values.ownerBirthday);
    setLoading(true);
    try {
      const accountId = await createAccount({
        type: accountType,
        displayName: displayName.trim(),
        parentPasscode: accountType === "family" ? parentPasscode : undefined,
      });
      await createOwnerParticipant({
        accountId,
        firstName: values.ownerFirstName.trim(),
        lastName: values.ownerLastName.trim(),
        birthday: values.ownerBirthday.trim(),
      });
      if (accountType === "family") {
        setCreatedAccountId(accountId);
        setStep(3);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(toUserErrorMessage(err, "Failed to save"));
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async (values: {
    kids: Array<{
      firstName: string;
      lastName: string;
      birthday: string;
      unlockType: "pin" | "emoji";
      unlockValue: string;
    }>;
  }) => {
    setError(null);
    const accountId = createdAccountId;
    if (!accountId) {
      setError("Account not found. Please go back.");
      return;
    }
    setLoading(true);
    try {
      for (const k of values.kids) {
        await addMember({
          accountId,
          firstName: k.firstName.trim(),
          lastName: k.lastName.trim(),
          birthday: k.birthday.trim(),
          unlockType: k.unlockType,
          unlockValue: k.unlockValue.trim(),
        });
      }
      router.push("/dashboard");
    } catch (err) {
      setError(toUserErrorMessage(err, "Failed to add members"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-8 p-6">
      <h1 className="text-2xl font-bold">Welcome to Grandma&apos;s Bookworms</h1>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
          </CardHeader>
          <CardContent>
            <OnboardingAccountForm
              defaultValues={{ accountType, displayName }}
              loading={loading}
              submitError={error}
              onSubmit={handleStep1}
            />
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>About you</CardTitle>
          </CardHeader>
          <CardContent>
            <OnboardingOwnerForm
              defaultValues={{
                ownerFirstName,
                ownerLastName,
                ownerBirthday,
              }}
              loading={loading}
              submitError={error}
              accountType={accountType === "" ? undefined : accountType}
              onSubmit={handleStep2}
            />
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Add kids (optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <OnboardingKidsForm
              loading={loading}
              submitError={error}
              onSubmit={handleStep3}
              onSkip={() => router.push("/dashboard")}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
