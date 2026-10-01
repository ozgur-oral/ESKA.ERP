
import type { Request, Response } from "express";
import { listPublicUsers } from "../auth/service.js";
import {
  changeTicketAssignment,
  changeTicketStatus,
  commentTicket,
  getTicket,
  getTickets,
  getTicketSummary,
  openTicket,
} from "../services/support-ticket.service.js";
import { routeParam } from "../utils/route-param.js";

type PublicUser = Awaited<
  ReturnType<typeof listPublicUsers>
>[number];

function enrich<T extends Record<string, any>>(
  ticket: T,
  users: PublicUser[]
) {
  const assignedUser = users.find(
    (user) => user.id === ticket.assignedUserId
  );

  const comments = ticket.comments?.map((comment: any) => {
    const author = users.find(
      (user) => user.id === comment.createdBy
    );

    return {
      ...comment,
      createdByName:
        comment.createdByName ??
        (author
          ? `${author.firstName} ${author.lastName}`
          : null),
    };
  });

  return {
    ...ticket,
    assignedUserName:
      ticket.assignedUserName ??
      (assignedUser
        ? `${assignedUser.firstName} ${assignedUser.lastName}`
        : null),
    comments,
  };
}

export async function ticketsIndex(
  req: Request,
  res: Response
) {
  try {
    const rows = await getTickets({
      customerId: req.query.customerId
        ? Number(req.query.customerId)
        : undefined,
      status: req.query.status
        ? String(req.query.status)
        : undefined,
      assignedUserId: req.query.assignedUserId
        ? Number(req.query.assignedUserId)
        : undefined,
      q: req.query.q
        ? String(req.query.q)
        : undefined,
    });

    const users = await listPublicUsers();

    return res.json({
      success: true,
      data: rows.map((ticket) => enrich(ticket, users)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Destek talepleri yüklenemedi.",
    });
  }
}

export async function ticketsSummary(
  _req: Request,
  res: Response
) {
  try {
    return res.json({
      success: true,
      data: await getTicketSummary(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Destek talepleri özeti yüklenemedi.",
    });
  }
}

export async function ticketShow(
  req: Request,
  res: Response
) {
  const ticketId = routeParam(req.params.id);

  const ticket = await getTicket(ticketId);

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: "Destek talebi bulunamadı.",
    });
  }

  const users = await listPublicUsers();

  return res.json({
    success: true,
    data: enrich(ticket, users),
  });
}

export async function ticketCreate(
  req: Request,
  res: Response
) {
  if (
    !req.body?.customerId ||
    !req.body?.subject ||
    !req.body?.description
  ) {
    return res.status(400).json({
      success: false,
      message: "Müşteri, konu ve açıklama zorunludur.",
    });
  }

  try {
    const data = await openTicket(
      req.body,
      req.auth?.userId
    );

    return res.status(201).json({
      success: true,
      message: "Destek talebi oluşturuldu.",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Destek talebi oluşturulamadı.",
    });
  }
}

export async function ticketCommentCreate(
  req: Request,
  res: Response
) {
  if (!req.body?.body) {
    return res.status(400).json({
      success: false,
      message: "Yorum zorunludur.",
    });
  }

  try {
    const ticketId = routeParam(req.params.id);

    const data = await commentTicket(
      ticketId,
      req.body,
      req.auth?.userId
    );

    return res.status(201).json({
      success: true,
      message: "Yorum eklendi.",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Yorum eklenemedi.",
    });
  }
}

export async function ticketStatusUpdate(
  req: Request,
  res: Response
) {
  if (!req.body?.status) {
    return res.status(400).json({
      success: false,
      message: "Durum zorunludur.",
    });
  }

  try {
    const ticketId = routeParam(req.params.id);

    const data = await changeTicketStatus(
      ticketId,
      String(req.body.status),
      req.body.resolution,
      req.auth?.userId
    );

    return res.json({
      success: true,
      message: "Destek talebinin durumu güncellendi.",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Durum güncellenemedi.",
    });
  }
}

export async function ticketAssignmentUpdate(
  req: Request,
  res: Response
) {
  try {
    const ticketId = routeParam(req.params.id);

    const data = await changeTicketAssignment(
      ticketId,
      req.body?.assignedUserId
        ? Number(req.body.assignedUserId)
        : null,
      req.body?.department,
      req.auth?.userId
    );

    return res.json({
      success: true,
      message: "Atama güncellendi.",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Atama güncellenemedi.",
    });
  }
}

export async function supportAgents(
  _req: Request,
  res: Response
) {
  const users = await listPublicUsers();

  const data = users.filter((user) =>
    ["ADMIN", "SUPPORT", "SERVICE"].includes(user.role)
  );

  return res.json({
    success: true,
    data,
  });
}