
import type { Request, Response } from "express";

import {
  addProjectAssignment,
  addProjectMilestone,
  addProjectTask,
  changeProjectTask,
  getProject,
  getProjectCompanies,
  getProjects,
  getProjectSummary,
  openProject,
} from "../services/project.service.js";

import { routeParam } from "../utils/route-param.js";

// GRUP ŞİRKETLERİ

export async function projectCompanies(
  _req: Request,
  res: Response
) {
  try {
    const data = await getProjectCompanies();

    return res.json({
      success: true,
      data,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Grup şirketleri yüklenemedi.",
    });
  }
}

// PROJE ÖZETİ

export async function projectsSummary(
  _req: Request,
  res: Response
) {
  try {
    const data = await getProjectSummary();

    return res.json({
      success: true,
      data,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Proje özeti yüklenemedi.",
    });
  }
}

// PROJE LİSTESİ

export async function projectsIndex(
  req: Request,
  res: Response
) {
  try {
    const data = await getProjects({
      status:
        typeof req.query.status === "string"
          ? req.query.status
          : undefined,

      type:
        typeof req.query.type === "string"
          ? req.query.type
          : undefined,

      q:
        typeof req.query.q === "string"
          ? req.query.q
          : undefined,
    });

    return res.json({
      success: true,
      data,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Projeler yüklenemedi.",
    });
  }
}

// PROJE DETAYI

export async function projectShow(
  req: Request,
  res: Response
) {
  const projectId = req.params.id;

  if (typeof projectId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Geçersiz proje numarası.",
    });
  }

  const project = await getProject(projectId);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Proje bulunamadı.",
    });
  }

  return res.json({
    success: true,
    data: project,
  });
}

// YENİ PROJE OLUŞTURMA

export async function projectCreate(
  req: Request,
  res: Response
) {
  if (
    typeof req.body?.name !== "string" ||
    !req.body.name.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Proje adı zorunludur.",
    });
  }

  try {
    const data = await openProject(
      req.body,
      req.auth?.userId
    );

    return res.status(201).json({
      success: true,
      message: "Proje oluşturuldu.",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Proje oluşturulamadı.",
    });
  }
}

// PROJEYE GÖREV EKLEME

export async function projectTaskCreate(
  req: Request,
  res: Response
) {
  if (!req.body?.title) {
    return res.status(400).json({
      success: false,
      message: "Görev başlığı zorunludur.",
    });
  }

  const projectId = req.params.id;

  if (typeof projectId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Geçersiz proje numarası.",
    });
  }

  try {
    const data = await addProjectTask(
      projectId,
      req.body,
      req.auth?.userId
    );

    return res.status(201).json({
      success: true,
      message: "Saha görevi oluşturuldu.",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Görev oluşturulamadı.",
    });
  }
}

// PROJE GÖREVİNİ GÜNCELLEME

export async function projectTaskUpdate(
  req: Request,
  res: Response
) {
  const taskId = req.params.taskId;

  if (typeof taskId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Geçersiz görev numarası.",
    });
  }

  try {
    const data = await changeProjectTask(
      taskId,
      req.body,
      req.auth?.userId
    );

    return res.json({
      success: true,
      message: "Görev güncellendi.",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Görev güncellenemedi.",
    });
  }
}

// PROJE PERSONEL GÖREVLENDİRMESİ

export async function projectAssignmentCreate(
  req: Request,
  res: Response
) {
  if (!req.body?.employeeName) {
    return res.status(400).json({
      success: false,
      message: "Personel adı zorunludur.",
    });
  }

  const projectId = req.params.id;

  if (typeof projectId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Geçersiz proje numarası.",
    });
  }

  try {
    const data = await addProjectAssignment(
      projectId,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Proje görevlendirmesi oluşturuldu.",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Görevlendirme yapılamadı.",
    });
  }
}

// PROJE KİLOMETRE TAŞI OLUŞTURMA

export async function projectMilestoneCreate(
  req: Request,
  res: Response
) {
  if (!req.body?.title) {
    return res.status(400).json({
      success: false,
      message:
        "Kilometre taşı başlığı zorunludur.",
    });
  }

  const projectId = req.params.id;

  if (typeof projectId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Geçersiz proje numarası.",
    });
  }

  try {
    const data = await addProjectMilestone(
      projectId,
      req.body
    );

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Kilometre taşı oluşturulamadı.",
    });
  }
}