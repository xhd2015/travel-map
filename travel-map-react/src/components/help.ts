import type { Spot } from '../api';

export const SCHEDULE_LIST_HELP = "先搜索景点，再确定导览图，最后确定行程表";
export const GUIDE_MAP_HELP = "使用小红书搜索";

export function getSpotListHelp(destinationName?: string): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = tomorrow.getMonth() + 1;
    const dd = tomorrow.getDate();
    const dateStr = `${yyyy}年${mm}月${dd}日`;
    const dest = destinationName || '目的地';
    return `使用Deepseek，提示词: 我将于${dateStr}，在${dest}旅游，请列出${dest}的“此生必去”景点，按重要性排序，给出一个表格，包含：景点名，开放时间范围，该景点游玩的意义，历史和典故，是否需要预约，预约方式，游玩方式（步行，观光车，缆车），游玩花费时间`;
}

export function getItineraryHelp(destinationName?: string, spots?: Spot[]): string {
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    const dateStr = `${nextDay.getFullYear()}年${nextDay.getMonth() + 1}月${nextDay.getDate()}日`;
    const dest = destinationName || '目的地';
    const spotsStr = spots && spots.length > 0 ? spots.map(s => s.name).join('，') : '';

    return `使用Deepseek，提示词： ${dateStr}，我在${dest}进行游玩，时间是早上08:00从酒店出发，需要在19:00之前结束，因为需要通勤，在20:00之前赶到禄口机场值机，我希望在${dest}游玩以下景点: ${spotsStr}。 请给出一个时间列表，细化到每个小时，从早上08:00出发，晚上19:00结束，不用考虑早餐时间，但需要考虑午餐时间(1h)。列表需要包含：开始时间-结束时间（格式例子： 10:00-11:00)，景点，耗时，景点内部游玩顺序，怎么通勤到下一个站点，通勤花费多久，注意保证开始时间+耗时+通勤花费的时间和下一站的开始时间的衔接性。 交通方式主要是打车，如果地铁更快也可以选择，如果景点有专门的观光车也可以考虑。如果时间不充裕，可以考虑省略一些排名相对靠后的景点. 我可以根据你的推荐，选择一个较近的酒店来开始一天的行程

注意: 考虑在最后行程结束之后，预留1h的缓冲时间给晚上的事情
`;
}

