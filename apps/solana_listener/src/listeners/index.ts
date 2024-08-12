import { listenToSlots } from './listenToSlots'
import { listenToSwapsUsingSubgraphs } from './subgraphs'

export async function runAllEvents() {
   // listenToSlots()
   listenToSwapsUsingSubgraphs()
}
