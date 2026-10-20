import type { FlowerKind } from "./flower-catalog";

export const flowerPhotos: Record<FlowerKind, { src: string; scientific: string; author: string; source: string; license: string; licenseUrl: string }> = {
  rose: {src:"flowers/rose.webp",scientific:"Rosa · garden hybrid",author:"TriviaKing / DWS-Montag Zen",source:"https://commons.wikimedia.org/wiki/File:Closeup_of_a_pink_rose_in_full_bloom..JPG",license:"CC BY-SA 3.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/3.0/"},
  "peach-rose": {src:"flowers/peach-rose.webp",scientific:"Rosa · apricot cultivar",author:"Rosendahl",source:"https://commons.wikimedia.org/wiki/File:Apricot_colored_rose_closeup.jpg",license:"Public domain",licenseUrl:"https://commons.wikimedia.org/wiki/File:Apricot_colored_rose_closeup.jpg#Licensing"},
  peony: {src:"flowers/peony.webp",scientific:"Paeonia",author:"Nathanieljoyce",source:"https://commons.wikimedia.org/wiki/File:Pink_Peony_Flower.jpg",license:"CC0 1.0",licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/"},
  cherry: {src:"flowers/cherry.webp",scientific:"Prunus ‘Kanzan’",author:"Marie-Lan Nguyen",source:"https://commons.wikimedia.org/wiki/File:Prunus_serrulata_Kanzan_blossom_Jardin_des_Plantes_2013-04-21.jpg",license:"CC BY 2.5",licenseUrl:"https://creativecommons.org/licenses/by/2.5/"},
  lily: {src:"flowers/lily.webp",scientific:"Lilium · Oriental hybrid ‘Marlon’",author:"George E. Koronaios",source:"https://commons.wikimedia.org/wiki/File:Pink_Lilium_Oriental_Marlon_flower.jpg",license:"CC BY-SA 4.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/"},
  alstroemeria: {src:"flowers/alstroemeria.webp",scientific:"Alstroemeria · garden cultivar",author:"LadyRabbit",source:"https://commons.wikimedia.org/wiki/File:Pink_Alstromeria_flower.jpg",license:"CC BY-SA 4.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/"},
  orchid: {src:"flowers/orchid.webp",scientific:"Phalaenopsis · hybrid",author:"Kev22",source:"https://commons.wikimedia.org/wiki/File:Phalaenopsis_pink_-_Orchidée_02.jpg",license:"CC BY-SA 4.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/"},
};
