import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/security.js";

const DEMO_PASSWORD = "Demo@LostFound2026";

function id(key: string): string {
  const hex = createHash("sha256").update(`lost-found-demo:${key}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function pairHash(lostId: string, foundId: string): string {
  return createHash("sha256").update(`${lostId}:${foundId}`).digest("hex");
}

function daysAgo(days: number, hour = 10): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const userSpecs = [
    ["student-main", "daniel.demo@campus.edu", "Daniel Demo Student", "FUPRE/CSC/20/001", "Computer Science", "student"],
    ["student-amara", "amara.okafor.demo@campus.edu", "Amara Okafor", "FUPRE/CSC/21/014", "Computer Science", "student"],
    ["student-chidi", "chidi.eze.demo@campus.edu", "Chidi Eze", "FUPRE/EEE/21/033", "Electrical Engineering", "student"],
    ["student-aisha", "aisha.bello.demo@campus.edu", "Aisha Bello", "FUPRE/PET/22/018", "Petroleum Engineering", "student"],
    ["student-tunde", "tunde.adeleke.demo@campus.edu", "Tunde Adeleke", "FUPRE/MEE/20/041", "Mechanical Engineering", "student"],
    ["student-grace", "grace.okon.demo@campus.edu", "Grace Okon", "FUPRE/CHM/22/009", "Chemical Engineering", "student"],
    ["staff", "staff.demo@campus.edu", "Lost & Found Officer", "STAFF/LFO/004", "Student Affairs", "staff"],
    ["admin", "admin.demo@campus.edu", "Campus Administrator", "STAFF/ICT/002", "ICT Directorate", "admin"],
    ["super", "superadmin.demo@campus.edu", "System Administrator", "STAFF/ICT/001", "ICT Directorate", "super_admin"],
  ] as const;

  const users = new Map<string, { id: string; email: string }>();
  for (const [key, email, displayName, studentStaffId, department, role] of userSpecs) {
    const user = await prisma.user.upsert({
      where: { email },
      create: { id: id(`user:${key}`), email, displayName, studentStaffId, department, role, passwordHash },
      update: { displayName, studentStaffId, department, role, passwordHash },
      select: { id: true, email: true },
    });
    users.set(key, user);
  }

  const lostSpecs = [
    ["laptop", "student-main", "Black Dell Latitude Laptop", "Electronics", "Black", "Dell", "Dell Latitude 5420 with a small white coding-club sticker near the trackpad.", "Engineering Library", 6, "matched"],
    ["phone", "student-amara", "Blue Samsung Galaxy A54", "Electronics", "Blue", "Samsung", "Blue Galaxy A54 in a clear case with a cracked lower-left corner.", "Lecture Theatre 2", 4, "open"],
    ["id-card", "student-chidi", "Student ID Card", "Documents", null, null, "FUPRE student identity card in a transparent card holder.", "Main Auditorium", 12, "recovered"],
    ["backpack", "student-aisha", "Grey HP Laptop Backpack", "Bags", "Grey", "HP", "Grey backpack containing notebooks and a black USB-C charger.", "ETF Building", 3, "open"],
    ["airpods", "student-tunde", "White Wireless Earbuds", "Electronics", "White", "Apple", "White AirPods Pro case with initials T.A. written inside the lid.", "Sports Complex", 2, "open"],
    ["calculator", "student-grace", "Casio Scientific Calculator", "Electronics", "Black", "Casio", "Casio fx-991ES Plus with a faded name label on the back.", "Chemistry Laboratory", 8, "open"],
    ["wallet", "student-main", "Brown Leather Wallet", "Accessories", "Brown", null, "Slim brown wallet containing an old library card.", "Cafeteria", 10, "closed_unrecovered"],
    ["keys", "student-amara", "Hostel Room Keys", "Keys", "Silver", null, "Three keys on a blue FUPRE keyring.", "Female Hostel Block B", 1, "open"],
    ["textbook", "student-chidi", "Engineering Mathematics Textbook", "Books", "Blue", null, "Engineering Mathematics textbook with handwritten notes on several pages.", "Engineering Workshop", 5, "open"],
    ["hoodie", "student-tunde", "Black Department Hoodie", "Clothing", "Black", null, "Black mechanical engineering hoodie, size L.", "Student Centre", 7, "open"],
  ] as const;

  const lost = new Map<string, string>();
  for (const [key, userKey, itemTitle, category, color, brand, description, locationLost, ago, status] of lostSpecs) {
    const reportId = id(`lost:${key}`);
    await prisma.lostReport.upsert({
      where: { id: reportId },
      create: {
        id: reportId,
        reporterUserId: users.get(userKey)!.id,
        itemTitle,
        category,
        color,
        brand,
        description,
        imageUrls: [],
        locationLost,
        dateLost: daysAgo(ago),
        status,
        createdAt: daysAgo(Math.max(ago - 1, 0), 12),
      },
      update: { reporterUserId: users.get(userKey)!.id, itemTitle, category, color, brand, description, imageUrls: [], locationLost, dateLost: daysAgo(ago), status },
    });
    lost.set(key, reportId);
  }

  const foundSpecs = [
    ["laptop", "student-grace", "Dell Latitude Black Laptop", "Electronics", "Black", "Dell", "Black Dell Latitude laptop with a small white sticker beside the trackpad.", "Engineering Library Entrance", 5, "Campus Lost & Found Office", "claimed"],
    ["phone", "student-tunde", "Blue Samsung Smartphone", "Electronics", "Blue", "Samsung", "Blue Samsung phone in a transparent case, lower-left corner cracked.", "Lecture Theatre 2", 3, "Student Affairs Desk", "open"],
    ["id-card", "student-aisha", "FUPRE Student ID Card", "Documents", null, null, "Student ID card found after an event at the auditorium.", "Main Auditorium", 11, "Security Post A", "closed"],
    ["backpack", "student-chidi", "Grey Laptop Backpack", "Bags", "Grey", "HP", "Grey HP backpack with notebooks and a black USB-C charger.", "ETF Ground Floor", 2, "Campus Lost & Found Office", "verified"],
    ["airpods", "student-grace", "White Earbuds Case", "Electronics", "White", "Apple", "White AirPods-style earbuds case found beside the sports pavilion.", "Sports Complex", 1, "Sports Office", "open"],
    ["wallet", "student-aisha", "Black Zip Wallet", "Accessories", "Black", null, "Small black zip wallet with two bank cards removed for safekeeping.", "Cafeteria", 6, "Campus Lost & Found Office", "open"],
    ["umbrella", "student-amara", "Red Folding Umbrella", "Other", "Red", null, "Compact red umbrella with a wooden handle.", "Library Lobby", 4, "Library Help Desk", "open"],
    ["flash", "student-tunde", "64GB USB Flash Drive", "Electronics", "Silver", "SanDisk", "Silver SanDisk USB flash drive attached to a green string.", "ICT Laboratory", 3, "ICT Office", "open"],
    ["watch", "student-grace", "Black Digital Wristwatch", "Accessories", "Black", "Casio", "Black digital watch found near the football pitch.", "Football Pitch", 9, "Sports Office", "open"],
    ["notebook", "student-chidi", "Blue Spiral Notebook", "Books", "Blue", null, "Blue A4 spiral notebook containing thermodynamics notes.", "Mechanical Workshop", 2, "Workshop Supervisor Office", "open"],
  ] as const;

  const found = new Map<string, string>();
  for (const [key, userKey, itemTitle, category, color, brand, description, locationFound, ago, custodyLocation, status] of foundSpecs) {
    const reportId = id(`found:${key}`);
    await prisma.foundReport.upsert({
      where: { id: reportId },
      create: {
        id: reportId,
        finderUserId: users.get(userKey)!.id,
        itemTitle,
        category,
        color,
        brand,
        description,
        imageUrls: [],
        locationFound,
        dateFound: daysAgo(ago),
        custodyLocation,
        status,
        createdAt: daysAgo(Math.max(ago - 1, 0), 13),
      },
      update: { finderUserId: users.get(userKey)!.id, itemTitle, category, color, brand, description, imageUrls: [], locationFound, dateFound: daysAgo(ago), custodyLocation, status },
    });
    found.set(key, reportId);
  }

  const matchSpecs = [
    ["laptop", "laptop", 96, ["category", "brand", "color", "title", "location"]],
    ["phone", "phone", 93, ["category", "brand", "color", "description", "location"]],
    ["id-card", "id-card", 99, ["category", "title", "location"]],
    ["backpack", "backpack", 94, ["category", "brand", "color", "description"]],
    ["airpods", "airpods", 88, ["category", "brand", "color", "location"]],
  ] as const;

  for (const [lostKey, foundKey, score, factors] of matchSpecs) {
    const lostReportId = lost.get(lostKey)!;
    const foundReportId = found.get(foundKey)!;
    const matchId = id(`match:${lostKey}:${foundKey}`);
    await prisma.matchCandidate.upsert({
      where: { id: matchId },
      create: {
        id: matchId,
        lostReportId,
        foundReportId,
        score,
        factorsJson: { matched: factors, source: "presentation-seed" },
        uniquePairHash: pairHash(lostReportId, foundReportId),
        notifiedAt: daysAgo(1, 9),
        computedAt: daysAgo(1, 8),
      },
      update: { score, factorsJson: { matched: factors, source: "presentation-seed" }, notifiedAt: daysAgo(1, 9) },
    });
  }

  const claimSpecs = [
    ["laptop", "student-main", "laptop", "laptop", "approved", "The white coding-club sticker near the trackpad and the BIOS asset label match my records.", "Ownership details verified against the lost report.", "admin", 2],
    ["phone", "student-amara", "phone", "phone", "pending", "The clear case has a crack at the lower-left corner and my lock-screen emergency contact uses my surname.", null, null, 1],
    ["backpack", "student-aisha", "backpack", "backpack", "under_review", "The bag contains my petroleum engineering notes and a USB-C charger marked AB.", null, null, 1],
    ["wallet", "student-main", null, "wallet", "rejected", "I lost a brown wallet around the cafeteria and thought this might be mine.", "Colour and contents do not match the claimant's description.", "staff", 5],
    ["id-card", "student-chidi", "id-card", "id-card", "completed", "The registration number and department on the card match my student profile.", "Identity confirmed in person before release.", "staff", 10],
  ] as const;

  const claims = new Map<string, string>();
  for (const [key, claimantKey, lostKey, foundKey, status, evidenceText, decisionReason, reviewerKey, ago] of claimSpecs) {
    const claimId = id(`claim:${key}`);
    await prisma.claim.upsert({
      where: { id: claimId },
      create: {
        id: claimId,
        linkedLostReportId: lostKey ? lost.get(lostKey)! : null,
        foundReportId: found.get(foundKey)!,
        claimantUserId: users.get(claimantKey)!.id,
        status,
        evidenceText,
        reviewedByUserId: reviewerKey ? users.get(reviewerKey)!.id : null,
        decisionReason,
        reviewedAt: reviewerKey ? daysAgo(Math.max(ago - 1, 0), 15) : null,
        createdAt: daysAgo(ago, 11),
      },
      update: {
        linkedLostReportId: lostKey ? lost.get(lostKey)! : null,
        foundReportId: found.get(foundKey)!,
        claimantUserId: users.get(claimantKey)!.id,
        status,
        evidenceText,
        reviewedByUserId: reviewerKey ? users.get(reviewerKey)!.id : null,
        decisionReason,
        reviewedAt: reviewerKey ? daysAgo(Math.max(ago - 1, 0), 15) : null,
      },
    });
    claims.set(key, claimId);
  }

  const handoverSpecs = [
    ["laptop", "admin", "ready", "Campus Lost & Found Office", new Date(Date.now() + 2 * 60 * 60 * 1000), null, null, "Bring a valid student ID for collection."],
    ["id-card", "staff", "completed", "Security Post A", daysAgo(9, 14), daysAgo(9, 14), "staff", "Student identity verified and ID card returned."],
  ] as const;

  for (const [key, officerKey, status, handoverPoint, handoverTime, completedAt, completedByKey, notes] of handoverSpecs) {
    const handoverId = id(`handover:${key}`);
    await prisma.handover.upsert({
      where: { id: handoverId },
      create: {
        id: handoverId,
        claimId: claims.get(key)!,
        officerUserId: users.get(officerKey)!.id,
        status,
        handoverPoint,
        handoverTime,
        completedAt,
        completedByUserId: completedByKey ? users.get(completedByKey)!.id : null,
        evidenceUrl: null,
        notes,
      },
      update: { officerUserId: users.get(officerKey)!.id, status, handoverPoint, handoverTime, completedAt, completedByUserId: completedByKey ? users.get(completedByKey)!.id : null, evidenceUrl: null, notes },
    });
  }

  const notificationSpecs = [
    ["match-laptop", "student-main", "match_found", "Strong match found", "A found Dell Latitude has a 96% match with your lost laptop report.", false, { lostReportId: lost.get("laptop"), foundReportId: found.get("laptop") }, 2],
    ["handover-laptop", "student-main", "handover_ready", "Item ready for handover", "Your laptop claim was approved. Collect it at the Campus Lost & Found Office.", false, { claimId: claims.get("laptop") }, 1],
    ["match-phone", "student-amara", "match_found", "Possible phone match", "A blue Samsung phone closely matches your lost report.", false, { lostReportId: lost.get("phone"), foundReportId: found.get("phone") }, 1],
    ["claim-phone", "staff", "claim_submitted", "New ownership claim", "A new claim for the blue Samsung smartphone is waiting for review.", false, { claimId: claims.get("phone") }, 1],
    ["claim-backpack", "admin", "claim_submitted", "Claim under review", "The grey HP backpack claim has evidence ready for review.", true, { claimId: claims.get("backpack") }, 1],
    ["id-returned", "student-chidi", "system", "Handover completed", "Your student ID card was successfully returned.", true, { claimId: claims.get("id-card") }, 9],
    ["wallet-rejected", "student-main", "claim_decided", "Claim reviewed", "Your claim for the black zip wallet was not approved.", true, { claimId: claims.get("wallet") }, 4],
  ] as const;

  for (const [key, recipientKey, type, title, body, isRead, metaJson, ago] of notificationSpecs) {
    const notificationId = id(`notification:${key}`);
    await prisma.notification.upsert({
      where: { id: notificationId },
      create: { id: notificationId, recipientUserId: users.get(recipientKey)!.id, type, title, body, isRead, metaJson, createdAt: daysAgo(ago, 16) },
      update: { recipientUserId: users.get(recipientKey)!.id, type, title, body, isRead, metaJson },
    });
  }

  const auditSpecs = [
    ["register-main", "auth.register", "user", users.get("student-main")!.id, users.get("student-main")!.id, { seeded: true }],
    ["claim-laptop", "claim.submitted", "claim", claims.get("laptop")!, users.get("student-main")!.id, { foundReportId: found.get("laptop"), seeded: true }],
    ["decision-laptop", "claim.decided", "claim", claims.get("laptop")!, users.get("admin")!.id, { decision: "approved", seeded: true }],
    ["handover-id", "handover.completed", "handover", id("handover:id-card"), users.get("staff")!.id, { seeded: true }],
    ["security-demo", "security.login_failed", "user", users.get("student-main")!.id, null, { email: "presentation.invalid@campus.edu", seeded: true }],
  ] as const;

  let auditIndex = 0;
  for (const [key, action, resource, resourceId, userId, details] of auditSpecs) {
    const auditId = id(`audit:${key}`);
    await prisma.auditLog.upsert({
      where: { id: auditId },
      create: { id: auditId, action, resource, resourceId, details, userId, ipAddress: "127.0.0.1", userAgent: "LostFound Presentation Seed", createdAt: daysAgo(auditIndex, 17) },
      update: { action, resource, resourceId, details, userId, ipAddress: "127.0.0.1", userAgent: "LostFound Presentation Seed" },
    });
    auditIndex += 1;
  }

  const counts = {
    users: await prisma.user.count(),
    lostReports: await prisma.lostReport.count(),
    foundReports: await prisma.foundReport.count(),
    matches: await prisma.matchCandidate.count(),
    claims: await prisma.claim.count(),
    handovers: await prisma.handover.count(),
    notifications: await prisma.notification.count(),
    auditLogs: await prisma.auditLog.count(),
  };

  console.log(JSON.stringify({ seeded: true, demoPassword: DEMO_PASSWORD, counts }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
