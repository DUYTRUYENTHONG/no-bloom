export const flowerKinds = ["rose", "peach-rose", "peony", "cherry", "lily", "alstroemeria", "orchid"] as const;
export type FlowerKind = typeof flowerKinds[number];

export const flowerCatalog: Record<FlowerKind, {
  vi: string; en: string; caption: string; descriptionVi: string; descriptionEn: string;
  petal: string; light: string; shade: string; center: string;
}> = {
  rose: { vi: "Hồng nhung", en: "Pink roses", caption: "PINK ROSES IN BLOOM", descriptionVi: "Hai đóa hồng sắc hồng nở từ nụ tròn có lá đài xanh.", descriptionEn: "Two vivid pink roses open from rounded buds with green sepals.", petal: "#D42A88", light: "#F36DBB", shade: "#86164F", center: "#f2bf6b" },
  "peach-rose": { vi: "Hồng đào", en: "Peach roses", caption: "PEACH ROSES IN BLOOM", descriptionVi: "Hai đóa hồng đào nở thành nhiều lớp cánh mềm.", descriptionEn: "Two peach roses unfold into layered soft petals.", petal: "#efa782", light: "#ffe1b9", shade: "#bb6680", center: "#eab06f" },
  peony: { vi: "Mẫu đơn", en: "Peonies", caption: "PEONIES IN BLOOM", descriptionVi: "Hai đóa mẫu đơn hồng mở những lớp cánh đầy đặn.", descriptionEn: "Two pink peonies open their abundant layered petals.", petal: "#e79abb", light: "#ffe2ec", shade: "#a44878", center: "#e6ae52" },
  cherry: { vi: "Anh đào", en: "Cherry blossoms", caption: "CHERRY BLOSSOMS", descriptionVi: "Những bông anh đào hồng nhạt nở trên cành.", descriptionEn: "Pale pink cherry blossoms open along their branches.", petal: "#f5bed0", light: "#fff0f1", shade: "#c97193", center: "#f0ba63" },
  lily: { vi: "Ly hồng", en: "Pink lilies", caption: "PINK LILIES IN BLOOM", descriptionVi: "Hai nụ ly thon dài mở thành những bông hoa hồng cánh cong.", descriptionEn: "Two long pink lily buds open into curved flowers.", petal: "#e474ae", light: "#fff1ed", shade: "#aa2c73", center: "#9c512f" },
  alstroemeria: { vi: "Lục bình Peru", en: "Alstroemeria", caption: "ALSTROEMERIA IN BLOOM", descriptionVi: "Những bông alstroemeria hồng tím nở trên thân lá xanh.", descriptionEn: "Pink lavender alstroemeria open among green leaves.", petal: "#c99ac5", light: "#f7dce8", shade: "#8a568e", center: "#795b36" },
  orchid: { vi: "Lan", en: "Orchids", caption: "ORCHIDS IN BLOOM", descriptionVi: "Hai nụ lan hồng tím ôm cánh, rồi mở thành hoa trên cành cong.", descriptionEn: "Two mauve orchid buds unfold into flowers on a curved stem.", petal: "#ae6eaa", light: "#efd2e7", shade: "#663267", center: "#e4a267" },
};
