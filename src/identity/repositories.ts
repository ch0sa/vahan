import type { PrismaClient, ParticipantRole } from "@prisma/client";

export class IdentityRepository {
  constructor(private readonly db: PrismaClient) {}
  findSyntheticUser(userId: string) { return this.db.user.findFirst({ where: { AND: [{ id: userId }, { id: { in: ["synthetic-ananya-rao", "synthetic-rahul-shetty"] } }, { role: "CITIZEN" }] } }); }
  findDemoOperator() { return this.db.user.findFirst({ where: { id: "synthetic-demo-operator", role: "DEMO_OPERATOR" } }); }
  listSyntheticUsers() { return this.db.user.findMany({ where: { id: { in: ["synthetic-ananya-rao", "synthetic-rahul-shetty"] } }, orderBy: { displayName: "asc" } }); }
  getCredential(userId: string) { return this.db.totpCredential.findUnique({ where: { userId } }); }
  createPendingCredential(input: { userId: string; encryptedSecret: string; encryptionIv: string; enrollmentChallengeHash: string; enrollmentExpiresAt: Date }) { return this.db.totpCredential.upsert({ where: { userId: input.userId }, update: { ...input, enrollmentState: "PENDING", lastAcceptedStep: null, failedAttempts: 0, lockedUntil: null }, create: { ...input, enrollmentState: "PENDING" } }); }
  updateCredential(userId: string, data: { enrollmentState?: string; lastAcceptedStep?: number; failedAttempts?: number; lockedUntil?: Date | null }) { return this.db.totpCredential.update({ where: { userId }, data }); }
  createSession(input: { userId: string; tokenHash: string; expiresAt: Date }) { return this.db.session.create({ data: input }); }
  findSession(tokenHash: string) { return this.db.session.findUnique({ where: { tokenHash }, include: { user: true } }); }
  revokeSession(tokenHash: string) { return this.db.session.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } }); }
  rotateSession(oldHash: string, input: { userId: string; tokenHash: string; expiresAt: Date }) { return this.db.$transaction(async (tx) => { await tx.session.updateMany({ where: { tokenHash: oldHash, revokedAt: null }, data: { revokedAt: new Date() } }); return tx.session.create({ data: input }); }); }
  async consumeVerificationAndCreateSession(input: { userId: string; expectedLastStep: number | null; acceptedStep: number; updates: { enrollmentState: string; failedAttempts: number; lockedUntil: Date | null }; tokenHash: string; expiresAt: Date; oldTokenHash?: string }) {
    return this.db.$transaction(async (tx) => {
      const consumed = await tx.totpCredential.updateMany({ where: { userId: input.userId, OR: input.expectedLastStep === null ? [{ lastAcceptedStep: null }] : [{ lastAcceptedStep: { lt: input.acceptedStep } }] }, data: { ...input.updates, lastAcceptedStep: input.acceptedStep, enrollmentChallengeHash: null, enrollmentExpiresAt: null } });
      if (consumed.count !== 1) return null;
      if (input.oldTokenHash) await tx.session.updateMany({ where: { tokenHash: input.oldTokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
      return tx.session.create({ data: { userId: input.userId, tokenHash: input.tokenHash, expiresAt: input.expiresAt } });
    });
  }
  applicationAccess(applicationId: string, userId: string) { return this.db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, participants: { where: { applicationId }, select: { role: true } } } }).then((user) => user ? { userId: user.id, role: user.role, participantRole: user.participants[0]?.role ?? null } : null); }
  participant(applicationId: string, userId: string, role: ParticipantRole) { return this.db.applicationParticipant.findFirst({ where: { applicationId, userId, role } }); }
}
