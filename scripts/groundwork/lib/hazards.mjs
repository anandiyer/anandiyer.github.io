/* Hazard layers. Both are exact point-in-polygon lookups against public
   authoritative services, which is why they carry the `confirmed` tier —
   provided we have a real coordinate for the site. Groundwork does not model
   flood or water risk itself (PRD §1); it reads the published hazard layers. */

import { getJSON } from './http.mjs';

const NFHL = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query';
const AQUEDUCT = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/aqueduct_water_risk/FeatureServer/1/query';

function pointQuery(base, outFields) {
  return (lon, lat) => {
    const q = new URLSearchParams({
      geometry: `${lon},${lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields,
      returnGeometry: 'false',
      resultRecordCount: '1',
      f: 'json',
    });
    return `${base}?${q}`;
  };
}

const femaUrl = pointQuery(NFHL, 'FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE,DFIRM_ID');
const aqueductUrl = pointQuery(AQUEDUCT, 'bws_label,bws_score,bws_cat,bws_raw,w_awr_def_tot_label,w_awr_def_tot_score,name_1');

/* FEMA flood zone. A point with no polygon is genuinely "unmapped" — large
   parts of the US have no effective DFIRM — which is a different fact from
   "not in a flood zone", and we keep them distinct. */
export async function floodZone(lat, lon) {
  const r = await getJSON(femaUrl(lon, lat));
  const a = r?.features?.[0]?.attributes;
  if (!a) {
    return {
      status: 'unmapped',
      zone: null,
      in_sfha: null,
      label: 'Not mapped in the NFHL',
      note: 'No effective FEMA flood hazard polygon covers this point. Absence of a mapped zone is not evidence of low flood risk.',
      source: 'FEMA National Flood Hazard Layer',
      source_url: 'https://hazards.fema.gov/femaportal/NFHL/',
      confidence: 'confirmed',
    };
  }
  const inSfha = a.SFHA_TF === 'T';
  return {
    status: 'mapped',
    zone: a.FLD_ZONE || null,
    subtype: a.ZONE_SUBTY || null,
    in_sfha: inSfha,
    static_bfe: a.STATIC_BFE > -9000 ? a.STATIC_BFE : null,
    dfirm_id: a.DFIRM_ID || null,
    label: inSfha
      ? `Zone ${a.FLD_ZONE} — Special Flood Hazard Area`
      : `Zone ${a.FLD_ZONE}${a.ZONE_SUBTY ? ` — ${a.ZONE_SUBTY.toLowerCase()}` : ''}`,
    source: 'FEMA National Flood Hazard Layer',
    source_url: 'https://hazards.fema.gov/femaportal/NFHL/',
    confidence: 'confirmed',
  };
}

/* WRI Aqueduct 4.0 baseline water stress (withdrawals / available supply). */
export async function waterStress(lat, lon) {
  const r = await getJSON(aqueductUrl(lon, lat));
  const a = r?.features?.[0]?.attributes;
  if (!a) return { status: 'unmapped', label: 'No Aqueduct basin covers this point', confidence: 'confirmed', source: 'WRI Aqueduct 4.0' };
  return {
    status: 'mapped',
    label: a.bws_label || null,
    score: a.bws_score ?? null,
    category: a.bws_cat ?? null,
    withdrawal_ratio: a.bws_raw ?? null,
    overall_water_risk: a.w_awr_def_tot_label || null,
    basin: a.name_1 || null,
    source: 'WRI Aqueduct 4.0 — baseline water stress',
    source_url: 'https://www.wri.org/aqueduct',
    confidence: 'confirmed',
  };
}
