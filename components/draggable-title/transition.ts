const HERO_ROUTE_ORDER = ["/", "/projects", "/insights", "/arcade"] as const;

function getRouteKey(pathname: string | null) {
  if (!pathname) return null;

  if (pathname === "/") return "/";

  for (const route of HERO_ROUTE_ORDER) {
    if (route !== "/" && pathname.startsWith(route)) {
      return route;
    }
  }

  return null;
}

function getRouteOrder(pathname: string | null) {
  const key = getRouteKey(pathname);
  return key ? HERO_ROUTE_ORDER.indexOf(key) : -1;
}

export function getHeroEntryTransition(pathname: string, previousPath: string | null) {
  const currentOrder = getRouteOrder(pathname);
  const previousOrder = getRouteOrder(previousPath);

  if (currentOrder === -1 || previousOrder === -1 || currentOrder === previousOrder) {
    return { useFlyIn: false, enterX: 0 };
  }

  return {
    useFlyIn: true,
    enterX: previousOrder < currentOrder ? -2000 : 2000,
  };
}
