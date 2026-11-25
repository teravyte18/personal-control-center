import { resolveRequestUser, AuthenticationRequiredError } from "@/server/request-user";
import { loadPersonalDataState } from "@/server/personal-data-store";
import { filterRecipes, getRecipes, recipeRoles, recipeSummary, recipeDetail, sortRecipes, storageValues, type RecipeRole, type StorageSuitability } from "@/domain/food";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const params = new URL(request.url).searchParams;
    const allowed = ["id","servings","query","role","tested","fridge","freezer","tag","maxMinutes","limit","offset"];
    if ([...params.keys()].some(key => !allowed.includes(key) || params.getAll(key).length !== 1)) return Response.json({error:"Invalid filters."},{status:400,headers});
    const id = params.get("id");
    const servings = params.get("servings");
    const role = params.get("role");
    const tested = params.get("tested");
    const fridge = params.get("fridge");
    const freezer = params.get("freezer");
    const maxMinutes = params.get("maxMinutes");
    const limit = Number(params.get("limit") ?? "25");
    const offset = Number(params.get("offset") ?? "0");
    const query = params.get("query") ?? "";
    const tag = params.get("tag") ?? "";
    if ((id !== null && (!id || id.length > 200 || [...params.keys()].some(key => key !== "id" && key !== "servings")))
      || (servings !== null && (!id || !Number.isFinite(Number(servings)) || Number(servings) <= 0 || Number(servings) > 100))
      || (role !== null && !recipeRoles.includes(role as RecipeRole))
      || (tested !== null && tested !== "true" && tested !== "false")
      || (fridge !== null && !storageValues.includes(fridge as StorageSuitability))
      || (freezer !== null && !storageValues.includes(freezer as StorageSuitability))
      || (maxMinutes !== null && (!Number.isInteger(Number(maxMinutes)) || Number(maxMinutes) < 1 || Number(maxMinutes) > 2880))
      || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(offset) || offset < 0 || query.length > 240 || tag.length > 40) {
      return Response.json({error:"Invalid recipe parameters."},{status:400,headers});
    }
    const state = await loadPersonalDataState(user.id);
    const recipes = getRecipes(state.snapshot.items);
    if (id) {
      const recipe = recipes.find(row => row.item.id === id);
      if (!recipe) return Response.json({error:"Recipe not found."},{status:404,headers});
      if (servings !== null && !recipe.details.servings) return Response.json({error:"Base servings are unknown."},{status:400,headers});
      return Response.json({revision:state.revision,recipe:recipeDetail(recipe,servings === null ? undefined : Number(servings))},{headers});
    }
    const rows = sortRecipes(filterRecipes(recipes,{query,tag,role:role ? role as RecipeRole : undefined,tested:tested === null ? undefined : tested === "true",
      fridge:fridge ? fridge as StorageSuitability : undefined,freezer:freezer ? freezer as StorageSuitability : undefined,maxMinutes:maxMinutes === null ? undefined : Number(maxMinutes)}),"name");
    const next = offset + limit;
    return Response.json({revision:state.revision,total:rows.length,records:rows.slice(offset,next).map(recipeSummary),nextOffset:next < rows.length ? next : null},{headers});
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({error:"Authentication required."},{status:401,headers});
    return Response.json({error:"Recipes are unavailable."},{status:503,headers});
  }
}
