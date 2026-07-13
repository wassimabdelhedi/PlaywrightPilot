// Traduit HTTP <-> service. Aucune règle métier ici — seulement de
// l'extraction de requête et du formatage de réponse.
import * as projectsService from "./projects.service.js";
import { sendSuccess } from "../../lib/response.js";
// TODO Phase 4 : remplacer par req.user.organizationId une fois
// l'authentification en place. Placeholder volontaire pour garder ce
// module testable dès maintenant, sans dépendance sur l'auth.
const TEMP_ORG_ID = "org_placeholder";
export async function create(req, res) {
    const project = await projectsService.createProject(TEMP_ORG_ID, req.body);
    sendSuccess(res, project, 201);
}
export async function list(req, res) {
    const result = await projectsService.listProjects(TEMP_ORG_ID, req.query);
    sendSuccess(res, result.items, 200, { total: result.total, page: result.page, pageSize: result.pageSize });
}
export async function getById(req, res) {
    const project = await projectsService.getProjectById(TEMP_ORG_ID, req.params.id);
    sendSuccess(res, project);
}
export async function update(req, res) {
    const project = await projectsService.updateProject(TEMP_ORG_ID, req.params.id, req.body);
    sendSuccess(res, project);
}
export async function remove(req, res) {
    await projectsService.deleteProject(TEMP_ORG_ID, req.params.id);
    res.status(204).send();
}
//# sourceMappingURL=projects.controller.js.map