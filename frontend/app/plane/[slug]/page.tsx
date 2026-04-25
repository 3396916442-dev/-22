import { notFound } from "next/navigation";
import BackButton from "./BackButton"; // 客户端交互按钮

// 机型数据（保持不变）
const planeData: Record<string, {
  name: string;
  description: string;
  params: string[];
  meaning?: string;
}> = {
  c919: {
    name: "中国商飞 C919",
    description: "C919是中国自主研制的大型干线民用喷气式飞机，由中国商飞公司研发制造，是中国航空工业的里程碑产品。",
    params: [
      "座级：158-168座",
      "航程：5555公里（标准航程）/ 6500公里（增程型）",
      "发动机：CFM LEAP-1C（国产长江-1000A发动机已完成取证）",
      "定位：单通道干线客机，对标空客A320neo、波音737MAX"
    ],
    meaning: "C919的成功研制，打破了国外对干线民航客机的垄断，是中国从航空大国向航空强国迈进的标志性产品。"
  },
  a320: {
    name: "空客 A320neo",
    description: "A320neo是空客公司推出的A320系列改进型，拥有更高的燃油效率和更低的噪音。",
    params: [
      "座级：150-180座",
      "航程：6300公里",
      "发动机：CFM LEAP-1A 或普惠 PW1100G",
      "特点：鲨鳍小翼，新一代发动机"
    ]
  },
  a350: {
    name: "空客 A350-900",
    description: "A350-900是空客新一代远程宽体客机，采用大量复合材料，燃油效率极高。",
    params: [
      "座级：300-350座",
      "航程：15000公里",
      "发动机：罗尔斯·罗伊斯 Trent XWB",
      "特点：超宽体客舱，低噪音"
    ]
  },
  b737: {
    name: "波音 737 MAX",
    description: "737 MAX是波音737系列的最新改进型，配备LEAP-1B发动机。",
    params: [
      "座级：162-210座",
      "航程：6500公里",
      "发动机：CFM LEAP-1B",
      "特点：先进技术翼梢小翼"
    ]
  },
  b787: {
    name: "波音 787-9 梦想客机",
    description: "波音787-9是波音787系列的加长型，采用全复合材料机身。",
    params: [
      "座级：290-330座",
      "航程：14140公里",
      "发动机：GEnx 或 Trent 1000",
      "特点：超大舷窗，低客舱高度"
    ]
  },
  arj21: {
    name: "中国商飞 ARJ21",
    description: "ARJ21是中国自主研制的中短程支线喷气式客机。",
    params: [
      "座级：78-90座",
      "航程：2225-3700公里",
      "发动机：通用电气 CF34-10A",
      "特点：适应高原机场，尾吊发动机布局"
    ]
  },
  ma60: {
    name: "新舟 60",
    description: "新舟60是中国研制的双发涡轮螺旋桨支线客机。",
    params: [
      "座级：52-60座",
      "航程：1600公里",
      "发动机：普惠 PW127J",
      "特点：经济性好，适用于短途航线"
    ]
  },
  g650: {
    name: "湾流 G650ER 公务机",
    description: "G650ER是湾流宇航公司生产的超远程公务机，以速度和航程著称。",
    params: [
      "座级：最多19名乘客",
      "航程：13890公里",
      "最大速度：0.925马赫",
      "特点：超远程，高速巡航"
    ]
  }
};

// ✅ 服务器组件（异步，无交互）
export default async function PlanePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = planeData[slug];
  if (!data) return notFound();

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-10">
        <h1 className="text-4xl text-black mb-6 flex items-center gap-3">
          <span>✈️</span> {data.name} 机型介绍
        </h1>
        <div className="prose prose-lg max-w-none">
          <p className="text-lg mb-4">{data.description}</p>
          <h3 className="text-xl font-semibold mt-6 mb-3">核心参数：</h3>
          <ul className="list-disc pl-6 space-y-2">
            {data.params.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          {data.meaning && (
            <>
              <h3 className="text-xl font-semibold mt-6 mb-3">核心意义：</h3>
              <p>{data.meaning}</p>
            </>
          )}
        </div>
        {/* 将客户端交互按钮抽离为独立组件 */}
        <BackButton />
      </div>
    </div>
  );
}