// Ícones e descrições dos cards do console (spec do subprojeto 2, §4.3).
import {
  IconArrowsExchange, IconBuildingCommunity, IconChartDots, IconPhoneOff, IconPhonePlus, IconPlus,
  IconSettings, IconUpload
} from "@tabler/icons-react";
import type { Catalog } from "./types";

export const CATALOG: Catalog = {
  groups: {
    "Setup":     { icon: IconSettings, description: "Cidades, canais e provisionamento" },
    "Analytics": { icon: IconChartDots, description: "Indicadores de todas as cidades" },
    "e-SUS":     { icon: IconArrowsExchange, description: "Produção enviada pelas cidades" }
  },
  screens: {
    "cities": { icon: IconBuildingCommunity, description: "Catálogo das cidades da plataforma" },
    "provision_city": { icon: IconPlus, description: "Criar uma cidade nova" },
    "register_channel": { icon: IconPhonePlus, description: "Ligar um número de canal a uma cidade" },
    "unknown_channels": { icon: IconPhoneOff, description: "Mensagens de números sem cidade" },
    "city_analytics": { icon: IconChartDots, description: "Indicadores de todas as cidades" },
    "city_production": { icon: IconUpload, description: "Produção enviada pelas cidades" }
  }
};
