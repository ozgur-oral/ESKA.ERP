
import type { Request, Response } from "express";
import * as s from "../services/organization.service.js";
import { ok } from "../utils/http.js";
import { recordAudit } from "../services/audit.service.js";

// ORGANİZASYON

export async function orgSummary(
  _q: Request,
  r: Response
) {
  return ok(r, await s.summary());
}

export async function orgCompanies(
  _q: Request,
  r: Response
) {
  return ok(r, await s.companies());
}

export async function orgDepartments(
  _q: Request,
  r: Response
) {
  return ok(r, await s.departments());
}

export async function orgEmployees(
  q: Request,
  r: Response
) {
  return ok(
    r,
    await s.employees(
      typeof q.query.q === "string"
        ? q.query.q
        : undefined
    )
  );
}

export async function orgEmployee(
  q: Request,
  r: Response
) {
  const x = await s.employee(Number(q.params.id));

  return x
    ? ok(r, x)
    : r.status(404).json({
        success: false,
        message: "Personel bulunamadı.",
      });
}

export async function orgEmployeeCreate(
  q: Request,
  r: Response
) {
  if (
    !q.body?.employeeNo ||
    !q.body?.firstName ||
    !q.body?.lastName ||
    !q.body?.companyId
  ) {
    return r.status(400).json({
      success: false,
      message:
        "Personel no, ad, soyad ve şirket zorunludur.",
    });
  }

  const x = await s.createEmployee(q.body);

  await recordAudit({
    action: "CREATE",
    module: "ORGANIZATION",
    entityType: "employee",
    entityId: x.id,
    entityLabel: `${x.firstName} ${x.lastName}`,
    newValues: x,
  });

  return r.status(201).json({
    success: true,
    data: x,
  });
}

// ŞİRKETLER ARASI PERSONEL GÖREVLENDİRME

export async function orgAssignmentCreate(
  q: Request,
  r: Response
) {
  if (
    !q.body?.assignedCompanyId ||
    !q.body?.title ||
    !q.body?.startDate
  ) {
    return r.status(400).json({
      success: false,
      message:
        "Görevlendirilen şirket, görev ve başlangıç tarihi zorunludur.",
    });
  }

  try {
    const employeeId = Number(q.params.id);

    const x = await s.addAssignment(
      employeeId,
      q.body,
      q.auth?.userId
    );

    await recordAudit({
      action: "ASSIGN",
      module: "ORGANIZATION",
      entityType: "employee",
      entityId: employeeId,
      newValues: x,
    });

    return r.status(201).json({
      success: true,
      data: x,
      message: "Personel görevlendirildi.",
    });
  } catch (e) {
    return r.status(400).json({
      success: false,
      message:
        e instanceof Error
          ? e.message
          : "Görevlendirme yapılamadı.",
    });
  }
}

// İNSAN KAYNAKLARI

export async function hrSummary(
  _q: Request,
  r: Response
) {
  return ok(r, await s.summary());
}

export async function hrOperationalSummary(
  _q: Request,
  r: Response
) {
  return ok(r, await s.hrSummary());
}

// PERSONEL MÜSAİTLİK KONTROLÜ

export async function employeeAvailability(
  q: Request,
  r: Response
) {
  if (
    !q.query.startDate ||
    !q.query.endDate
  ) {
    return r.status(400).json({
      success: false,
      message:
        "Başlangıç ve bitiş tarihi zorunludur.",
    });
  }

  return ok(
    r,
    await s.employeeAvailability(
      Number(q.params.id),
      String(q.query.startDate),
      String(q.query.endDate)
    )
  );
}

// PERSONEL İZİNLERİ

export async function employeeLeaves(
  q: Request,
  r: Response
) {
  return ok(
    r,
    await s.leaves(Number(q.params.id))
  );
}

export async function employeeLeaveCreate(
  q: Request,
  r: Response
) {
  if (
    !q.body?.startDate ||
    !q.body?.endDate
  ) {
    return r.status(400).json({
      success: false,
      message: "İzin tarihleri zorunludur.",
    });
  }

  const employeeId = Number(q.params.id);

  const x = await s.createLeave(
    employeeId,
    q.body,
    q.auth?.userId
  );

  await recordAudit({
    action: "LEAVE_CREATE",
    module: "HR",
    entityType: "employee",
    entityId: employeeId,
    newValues: x,
  });

  return r.status(201).json({
    success: true,
    data: x,
  });
}

export async function leaveStatus(
  q: Request,
  r: Response
) {
  const leaveId = Number(q.params.id);

  const x = await s.setLeaveStatus(
    leaveId,
    String(q.body?.status),
    q.auth?.userId
  );

  await recordAudit({
    action: "LEAVE_STATUS",
    module: "HR",
    entityType: "employeeLeave",
    entityId: leaveId,
    newValues: x,
  });

  return ok(r, x);
}

// PERSONEL SERTİFİKALARI

export async function employeeCertifications(
  q: Request,
  r: Response
) {
  return ok(
    r,
    await s.certifications(Number(q.params.id))
  );
}

export async function employeeCertificationCreate(
  q: Request,
  r: Response
) {
  if (!q.body?.name) {
    return r.status(400).json({
      success: false,
      message: "Sertifika adı zorunludur.",
    });
  }

  const employeeId = Number(q.params.id);

  const x = await s.createCertification(
    employeeId,
    q.body,
    q.auth?.userId
  );

  await recordAudit({
    action: "CERTIFICATION_CREATE",
    module: "HR",
    entityType: "employee",
    entityId: employeeId,
    newValues: x,
  });

  return r.status(201).json({
    success: true,
    data: x,
  });
}

// PERSONEL EĞİTİMLERİ

export async function employeeTrainings(
  q: Request,
  r: Response
) {
  return ok(
    r,
    await s.trainings(Number(q.params.id))
  );
}

export async function employeeTrainingCreate(
  q: Request,
  r: Response
) {
  if (!q.body?.title) {
    return r.status(400).json({
      success: false,
      message: "Eğitim adı zorunludur.",
    });
  }

  const employeeId = Number(q.params.id);

  const x = await s.createTraining(
    employeeId,
    q.body,
    q.auth?.userId
  );

  await recordAudit({
    action: "TRAINING_CREATE",
    module: "HR",
    entityType: "employee",
    entityId: employeeId,
    newValues: x,
  });

  return r.status(201).json({
    success: true,
    data: x,
  });
}