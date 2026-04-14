"use client";

import { useQuery } from "convex/react";
import { Badge } from "@/components/badge";
import { useFamilySession } from "@/components/family/family-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { getBadgeDisplayInfo } from "@/convex/badges/config";
import { getBadgeIcon } from "@/lib/badges/icons";

export default function RewardsPage() {
  const account = useQuery(api.accounts.getMyAccount, {});
  const participants = useQuery(api.participants.listMyParticipants, {});
  const raffleByParticipant = useQuery(
    api.rewards.getRaffleTicketsForMyParticipants,
    {},
  );
  const { activeParticipantId } = useFamilySession();

  const currentId =
    account?.type === "family"
      ? activeParticipantId
      : (participants?.[0]?._id ?? null);
  const badges = useQuery(
    api.rewards.getBadgesForParticipant,
    currentId ? { participantId: currentId } : "skip",
  );
  const bingoLines = useQuery(
    api.rewards.getBingoLinesForParticipant,
    currentId ? { participantId: currentId } : "skip",
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Rewards</h1>

      <Card>
        <CardHeader>
          <CardTitle>Raffle tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-4">
            Tickets are used by Grandma for the raffle. Complete activities and
            get BINGO lines to earn more.
          </p>
          {raffleByParticipant === undefined ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : raffleByParticipant.length === 0 ? (
            <p className="text-muted-foreground">No participants yet.</p>
          ) : (
            <ul className="space-y-2">
              {(account?.type === "family" && currentId
                ? raffleByParticipant.filter(
                    (r) => r.participantId === currentId,
                  )
                : raffleByParticipant
              ).map((r) => (
                <li key={r.participantId} className="flex justify-between">
                  <span>{r.participantName}</span>
                  <span className="font-medium">{r.ticketCount} tickets</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {participants && participants.length > 0 && currentId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
            </CardHeader>
            <CardContent>
              {badges === undefined ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : badges.length === 0 ? (
                <p className="text-muted-foreground">
                  No badges yet. Complete activities and get BINGO to earn some!
                </p>
              ) : (
                <ul className="flex flex-wrap gap-4">
                  {badges.map((b) => {
                    const info = getBadgeDisplayInfo(b.badgeId);
                    const name = info?.name ?? b.badgeId;
                    const description = info?.description;
                    const tier = info?.tier ?? "base";
                    const Icon = info ? getBadgeIcon(info.icon) : null;
                    return (
                      <li
                        key={`${b.badgeId}-${b.earnedAt}`}
                        className="rounded-lg border p-4 text-center min-w-[120px] flex flex-col items-center"
                      >
                        <div className="max-w-24 w-full mx-auto">
                          <Badge
                            content={
                              Icon ? (
                                <Icon className="size-[30cqw] shrink-0" />
                              ) : (
                                <span className="text-[30cqw]">★</span>
                              )
                            }
                            label={name}
                            variant={tier}
                          />
                        </div>
                        <p className="font-medium mt-1">{name}</p>
                        {description && (
                          <p className="text-muted-foreground text-xs mt-1">
                            {description}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>BINGO lines</CardTitle>
            </CardHeader>
            <CardContent>
              {bingoLines === undefined ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : bingoLines.length === 0 ? (
                <p className="text-muted-foreground">No BINGO lines yet.</p>
              ) : (
                <ul className="space-y-1">
                  {bingoLines.map((l, i) => (
                    <li key={i}>
                      {l.lineType}{" "}
                      {l.lineType !== "diagonal"
                        ? l.lineIndex + 1
                        : l.lineIndex === 0
                          ? "\\"
                          : "/"}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
