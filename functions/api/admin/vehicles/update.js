// WINON CAR - Cloudflare Pages Function: /api/admin/vehicles/update
// Endpoint dédié à la mise à jour des véhicules

import { handleVehicleUpdate } from '../vehicles.js';

export async function onRequestPost(context) {
  return handleVehicleUpdate(context);
}

export async function onRequestPatch(context) {
  return handleVehicleUpdate(context);
}

