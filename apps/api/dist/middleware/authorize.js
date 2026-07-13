// Contrôle d'accès basé sur les rôles. S'utilise APRÈS `authenticate`
// sur une route (req.user doit déjà exister). Exemple :
//   router.delete("/:id", authenticate, authorize("OWNER", "ADMIN"), ...)
import { ForbiddenError } from "../lib/errors.js";
export function authorize(...allowedRoles) {
    return (req, _res, next) => {
        if (!allowedRoles.includes(req.user.role)) {
            next(new ForbiddenError(`Rôle requis : ${allowedRoles.join(" ou ")}`));
            return;
        }
        next();
    };
}
//# sourceMappingURL=authorize.js.map