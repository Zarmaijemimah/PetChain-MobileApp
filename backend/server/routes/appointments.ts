/* eslint-disable @typescript-eslint/no-non-null-assertion */
import express from 'express';

import { authenticateJWT, type AuthenticatedRequest } from '../../middleware/auth';
import { AppointmentStatus, AppointmentType } from '../../models/Appointment';
import { UserRole } from '../../models/UserRole';
import { ok, sendError } from '../response';
import { store, type StoredAppointment } from '../store';

const router = express.Router();

function toResponse(a: StoredAppointment) {
  return {
    success: true as const,
    data: a,
    timestamp: new Date().toISOString(),
  };
}

// All appointment routes require authentication
router.use(authenticateJWT);

router.get('/', (req: AuthenticatedRequest, res) => {
  const petId = (req.query as Record<string, string | undefined>).petId;
  const vetId = (req.query as Record<string, string | undefined>).vetId;

  // Owners must provide petId
  if (req.user!.role === UserRole.OWNER && !petId) {
    return sendError(res, 403, 'FORBIDDEN', 'PetId parameter is required for pet owners');
  }

  if (petId) {
    const pet = store.pets.get(petId);
    if (pet && req.user!.role === UserRole.OWNER && req.user!.id !== pet.ownerId) {
      return sendError(
        res,
        403,
        'FORBIDDEN',
        'You do not have permission to view these appointments',
      );
    }
  }

  // Vets should see their own appointments if not specified otherwise
  if (req.user!.role === UserRole.VET && !vetId && !petId) {
    // default to showing vet's appointments
  }

  let list = [...store.appointments.values()];
  if (petId) list = list.filter((a) => a.petId === petId);
  if (vetId) list = list.filter((a) => a.vetId === vetId);

  if (req.user!.role === UserRole.VET && !petId && !vetId) {
    list = list.filter((a) => a.vetId === req.user!.id);
  }

  list.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  return res.json({
    success: true,
    data: list,
    total: list.length,
    timestamp: new Date().toISOString(),
  });
});

router.get('/:id', (req: AuthenticatedRequest, res) => {
  const row = store.appointments.get(req.params.id);
  if (!row) return sendError(res, 404, 'NOT_FOUND', 'Appointment not found');

  // Authorization check
  const pet = store.pets.get(row.petId);
  if (req.user!.role === UserRole.OWNER && pet?.ownerId !== req.user!.id) {
    return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to view this appointment');
  }
  if (req.user!.role === UserRole.VET && row.vetId !== req.user!.id) {
    return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to view this appointment');
  }

  return res.json(toResponse(row));
});

router.post('/', (req: AuthenticatedRequest, res) => {
  const body = req.body as Partial<StoredAppointment>;
  if (!body.petId?.trim() || !body.vetId?.trim() || !body.date?.trim() || !body.time?.trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'petId, vetId, date, and time are required');
  }

  const pet = store.pets.get(body.petId.trim());
  if (!pet) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'petId must reference an existing pet');
  }

  // Authorization: Only owner (for their pet) or vet or admin can create appointments
  if (req.user!.role === UserRole.OWNER && pet.ownerId !== req.user!.id) {
    return sendError(res, 403, 'FORBIDDEN', 'You can only create appointments for your own pets');
  }

  const t = new Date().toISOString();
  const id = store.newId();
  const row: StoredAppointment = {
    id,
    petId: body.petId.trim(),
    vetId: body.vetId.trim(),
    date: body.date.trim(),
    time: body.time.trim(),
    durationMinutes: body.durationMinutes ?? 30,
    type: (body.type as AppointmentType) ?? AppointmentType.ROUTINE_CHECKUP,
    status: (body.status as AppointmentStatus) ?? AppointmentStatus.PENDING,
    notes: body.notes?.trim(),
    createdAt: t,
    updatedAt: t,
  };
  store.appointments.set(id, row);
  return res.status(201).json(toResponse(row));
});

router.put('/:id', (req: AuthenticatedRequest, res) => {
  const row = store.appointments.get(req.params.id);
  if (!row) return sendError(res, 404, 'NOT_FOUND', 'Appointment not found');

  const pet = store.pets.get(row.petId);
  // Authorization: Only owner (for their pet), vet (if assigned), or admin can update
  const isOwner = req.user!.role === UserRole.OWNER && pet?.ownerId === req.user!.id;
  const isAssignedVet = req.user!.role === UserRole.VET && row.vetId === req.user!.id;
  const isAdmin = req.user!.role === UserRole.ADMIN;

  if (!isOwner && !isAssignedVet && !isAdmin) {
    return sendError(
      res,
      403,
      'FORBIDDEN',
      'You do not have permission to update this appointment',
    );
  }

  const b = req.body as Partial<StoredAppointment>;
  const t = new Date().toISOString();
  const next: StoredAppointment = {
    ...row,
    ...(b.date !== undefined ? { date: String(b.date) } : {}),
    ...(b.time !== undefined ? { time: String(b.time) } : {}),
    ...(b.durationMinutes !== undefined ? { durationMinutes: b.durationMinutes } : {}),
    ...(b.type !== undefined ? { type: b.type as AppointmentType } : {}),
    ...(b.status !== undefined ? { status: b.status as AppointmentStatus } : {}),
    ...(b.notes !== undefined ? { notes: b.notes } : {}),
    ...(b.vetId !== undefined && (isAdmin || isAssignedVet) ? { vetId: String(b.vetId) } : {}),
    ...(b.petId !== undefined && (isAdmin || isOwner) ? { petId: String(b.petId) } : {}),
    updatedAt: t,
    ...(b.status === AppointmentStatus.CANCELLED
      ? { cancelledAt: t, cancellationReason: b.cancellationReason ?? row.cancellationReason }
      : {}),
  };
  store.appointments.set(row.id, next);
  return res.json(toResponse(next));
});

router.delete('/:id', (req: AuthenticatedRequest, res) => {
  const row = store.appointments.get(req.params.id);
  if (!row) return sendError(res, 404, 'NOT_FOUND', 'Appointment not found');

  const pet = store.pets.get(row.petId);
  const isOwner = req.user!.role === UserRole.OWNER && pet?.ownerId === req.user!.id;
  const isAdmin = req.user!.role === UserRole.ADMIN;

  if (!isOwner && !isAdmin) {
    return sendError(
      res,
      403,
      'FORBIDDEN',
      'You do not have permission to delete this appointment',
    );
  }

  store.appointments.delete(req.params.id);
  return res.json(ok(null, 'Appointment deleted'));
});

/**
 * POST /appointments/check-conflicts
 * Check for conflicting appointments for a pet and vet at a given time.
 * Body: { petId, vetId, date, time, durationMinutes?, excludeId? }
 * Returns: { conflicts: Array<{type, appointment}>, canSave: boolean, reason?: string }
 */
router.post('/check-conflicts', (req: AuthenticatedRequest, res) => {
  const body = req.body as {
    petId?: string;
    vetId?: string;
    date?: string;
    time?: string;
    durationMinutes?: number;
    excludeId?: string;
  };

  if (!body.petId?.trim() || !body.vetId?.trim() || !body.date?.trim() || !body.time?.trim()) {
    return sendError(
      res,
      400,
      'VALIDATION_ERROR',
      'petId, vetId, date, and time are required',
    );
  }

  const petId = body.petId.trim();
  const vetId = body.vetId.trim();
  const date = body.date.trim();
  const time = body.time.trim();
  const duration = body.durationMinutes ?? 30;
  const excludeId = body.excludeId?.trim();

  // Parse the requested appointment times
  const requestedStart = new Date(`${date}T${time}`);
  const requestedEnd = new Date(requestedStart.getTime() + duration * 60_000);

  if (isNaN(requestedStart.getTime())) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid date/time format');
  }

  const conflicts: Array<{ type: 'exact' | 'near'; appointment: StoredAppointment }> = [];

  // Check all non-cancelled appointments
  for (const appt of store.appointments.values()) {
    if (appt.id === excludeId) continue;
    if (appt.status === AppointmentStatus.CANCELLED) continue;

    const apptStart = new Date(`${appt.date}T${appt.time}`);
    const apptEnd = new Date(apptStart.getTime() + (appt.durationMinutes ?? 30) * 60_000);

    // Check pet conflicts (same pet, overlapping times)
    if (appt.petId === petId) {
      const overlap = timeRangesOverlap(requestedStart, requestedEnd, apptStart, apptEnd);
      const gap = minGapBetweenRanges(requestedStart, requestedEnd, apptStart, apptEnd);

      if (overlap) {
        conflicts.push({ type: 'exact', appointment: appt });
      } else if (gap < 30) {
        conflicts.push({ type: 'near', appointment: appt });
      }
    }

    // Check vet conflicts (same vet, overlapping times)
    if (appt.vetId === vetId) {
      const overlap = timeRangesOverlap(requestedStart, requestedEnd, apptStart, apptEnd);

      if (overlap) {
        conflicts.push({ type: 'exact', appointment: appt });
      }
    }
  }

  // Determine if we can save
  const hasExactConflict = conflicts.some((c) => c.type === 'exact');
  const hasNearConflict = conflicts.some((c) => c.type === 'near');

  return res.json({
    success: true,
    data: {
      conflicts,
      canSave: !hasExactConflict,
      hasWarning: hasNearConflict,
      reason: hasExactConflict
        ? 'Exact time conflict found. Cannot save.'
        : hasNearConflict
          ? 'Near-time conflict found (< 30 min gap). Proceed with caution.'
          : null,
    },
    timestamp: new Date().toISOString(),
  });
});

function timeRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date,
): boolean {
  return start1 < end2 && end1 > start2;
}

function minGapBetweenRanges(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date,
): number {
  if (end1 <= start2) return Math.max(0, start2.getTime() - end1.getTime());
  if (end2 <= start1) return Math.max(0, start1.getTime() - end2.getTime());
  return 0; // Ranges overlap
}

export default router;
