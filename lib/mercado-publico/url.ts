export function buildMercadoPublicoUrl(code: string) {
  const normalizedCode = code.trim();
  if (!normalizedCode) {
    return null;
  }

  // The old DetailsAcquisition.aspx route can require permissions/session.
  // The public search page is safer and lets users open Mercado Publico by code.
  const url = new URL("https://www.mercadopublico.cl/Home/BusquedaLicitacion");
  url.searchParams.set("codigo", normalizedCode);
  return url.toString();
}
