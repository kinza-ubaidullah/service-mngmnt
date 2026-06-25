import api from '../services/api';

/** Normalize workshop API shape `{ lead, ...workshopFields }` into a flat lead + workshop_job */
export const normalizeJobForPdf = (input: any) => {
  if (!input) return input;

  if (input.lead && typeof input.lead === 'object' && !input.customer && !input.lead_id) {
    const { lead, ...workshop } = input;
    const workshopJob =
      lead.workshop_job ||
      (workshop.id || workshop.received_date || workshop.status
        ? {
            id: workshop.id,
            lead_id: workshop.lead_id ?? lead.id,
            received_date: workshop.received_date,
            received_by: workshop.received_by,
            promised_delivery: workshop.promised_delivery,
            priority: workshop.priority,
            status: workshop.status,
            current_day_count: workshop.current_day_count,
            notes: workshop.notes,
            delivered_at: workshop.delivered_at,
            delivered_by: workshop.delivered_by,
            delivery_assigned_to: workshop.delivery_assigned_to,
            delivery_assigned_at: workshop.delivery_assigned_at,
          }
        : null);

    return { ...lead, workshop_job: workshopJob };
  }

  return input;
};

/** Fetch full lead + job history so PDFs include every recorded detail */
export const enrichJobForPdf = async (input: any) => {
  const job = normalizeJobForPdf(input);
  const id = job?.id;
  if (!id) return job;

  const hasHistory = Array.isArray(job.history) && job.history.length > 0;
  const hasWorkshop = !!job.workshop_job;

  if (hasHistory && hasWorkshop) return job;

  try {
    const res = await api.get(`/leads/${id}/history`);
    const fullLead = res.data.lead || {};
    const history = res.data.history || job.history || [];

    return {
      ...fullLead,
      ...job,
      customer: job.customer || fullLead.customer,
      technician: job.technician || fullLead.technician,
      team: job.team || fullLead.team,
      workshop_job: job.workshop_job || fullLead.workshop_job,
      problem_details: job.problem_details ?? fullLead.problem_details,
      actual_problem: job.actual_problem ?? fullLead.actual_problem,
      repair_details: job.repair_details ?? fullLead.repair_details,
      item_pictures: job.item_pictures ?? fullLead.item_pictures,
      house_image: job.house_image ?? fullLead.house_image,
      history,
    };
  } catch {
    return job;
  }
};
