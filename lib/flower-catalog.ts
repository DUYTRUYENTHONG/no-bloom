export const flowerKinds = ["rose", "peach-rose", "peony", "cherry", "lily", "alstroemeria", "orchid"] as const;
export type FlowerKind = typeof flowerKinds[number];

export const flowerCatalog: Record<FlowerKind, {
  vi: string; en: string; caption: string; descriptionVi: string; descriptionEn: string;
  petal: string; light: string; shade: string; center: string;
}> = {
  rose: { vi: "Hồng phấn", en: "Pink roses", caption: "PINK ROSES IN BLOOM", descriptionVi: "Ảnh chụp hoa hồng phấn với những lớp cánh mềm.", descriptionEn: "A photograph of a layered pink garden rose.", petal: "#D42A88", light: "#F36DBB", shade: "#86164F", center: "#f2bf6b" },
  "peach-rose": { vi: "Hồng đào", en: "Peach roses", caption: "PEACH ROSES IN BLOOM", descriptionVi: "Ảnh chụp hoa hồng màu đào.", descriptionEn: "A photograph of an apricot-colored rose.", petal: "#efa782", light: "#ffe1b9", shade: "#bb6680", center: "#eab06f" },
  peony: { vi: "Mẫu đơn (Paeonia)", en: "Peonies", caption: "PEONIES IN BLOOM", descriptionVi: "Ảnh chụp hoa mẫu đơn Paeonia hồng nở rộ.", descriptionEn: "A photograph of a pink Paeonia flower.", petal: "#e79abb", light: "#ffe2ec", shade: "#a44878", center: "#e6ae52" },
  cherry: { vi: "Anh đào Kanzan", en: "Cherry blossoms", caption: "CHERRY BLOSSOMS", descriptionVi: "Ảnh chụp anh đào Kanzan trên cành.", descriptionEn: "A photograph of Prunus Kanzan blossoms on their branch.", petal: "#f5bed0", light: "#fff0f1", shade: "#c97193", center: "#f0ba63" },
  lily: { vi: "Ly hồng", en: "Pink lilies", caption: "PINK LILIES IN BLOOM", descriptionVi: "Ảnh chụp hoa ly Oriental Marlon hồng, với nụ và lá.", descriptionEn: "A photograph of pink Oriental Marlon lily with buds and leaves.", petal: "#e474ae", light: "#fff1ed", shade: "#aa2c73", center: "#9c512f" },
  alstroemeria: { vi: "Alstroemeria (ly Peru)", en: "Alstroemeria", caption: "ALSTROEMERIA IN BLOOM", descriptionVi: "Ảnh chụp hoa Alstroemeria hồng trên thân lá xanh.", descriptionEn: "A photograph of pink Alstroemeria flowers among their leaves.", petal: "#c99ac5", light: "#f7dce8", shade: "#8a568e", center: "#795b36" },
  orchid: { vi: "Lan hồ điệp", en: "Moth orchids", caption: "ORCHIDS IN BLOOM", descriptionVi: "Ảnh chụp lan hồ điệp Phalaenopsis với hoa và nụ trên cành.", descriptionEn: "A photograph of Phalaenopsis orchid flowers and buds on their stem.", petal: "#ae6eaa", light: "#efd2e7", shade: "#663267", center: "#e4a267" },
};
