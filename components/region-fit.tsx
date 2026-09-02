/**
 * Sinaliza pro piloto logado se ele está dentro ou fora da zona de atuação de
 * uma campanha / oportunidade. Não renderiza nada quando `fit` é null (sem UF
 * do piloto ou campanha sem região).
 */
export function RegionFit({
  fit,
  region,
}: {
  fit: boolean | null;
  region: string | null | undefined;
}) {
  if (fit === null) return null;

  return fit ? (
    <p className="text-success bg-success-soft rounded-md px-3 py-2 text-xs font-medium">
      Você está na zona de atuação desta campanha
      {region ? ` (${region})` : ""}.
    </p>
  ) : (
    <p className="text-muted-foreground bg-muted rounded-md px-3 py-2 text-xs">
      Sua região está fora da zona de atuação desta campanha
      {region ? ` (${region})` : ""}. Você ainda pode se candidatar.
    </p>
  );
}
