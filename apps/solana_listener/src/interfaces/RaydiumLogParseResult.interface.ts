export interface LogParseResult {
   logType: number
   data: any
}

export enum LogType {
   InitLiquidity = 0,
   AddLiquidity = 1,
   RemoveLiquidity = 2,
   SwapBaseIn = 3,
   SwapBaseOut = 4,
}
