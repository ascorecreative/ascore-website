export const leadStatuses = {
  new:'New enquiry', no_reply:'No reply after acknowledgement', awaiting_reply:'Awaiting reply',
  follow_up:'Follow-up needed', call_again:'Call again', no_answer:'No answer', callback:'Callback requested',
  contacted:'Contacted', qualified:'Interested / qualified', proposal:'Proposal sent', won:'Won', lost:'Lost',
  not_interested:'Not interested', do_not_contact:'Do not contact', invalid_number:'Invalid number'
}
export const callOutcomes = {
  no_answer:'No answer', busy:'Busy — call again', call_again:'Call again', callback:'Callback requested',
  reached:'Spoke — follow-up needed', interested:'Interested', proposal:'Proposal requested',
  not_interested:'Not interested', wrong_number:'Wrong / invalid number', do_not_contact:'Do not contact'
}
export const outcomeStatuses = {no_answer:'no_answer',busy:'call_again',call_again:'call_again',callback:'callback',reached:'follow_up',interested:'qualified',proposal:'qualified',not_interested:'not_interested',wrong_number:'invalid_number',do_not_contact:'do_not_contact'}
export const closedLeadStatuses = ['won','lost','not_interested','do_not_contact','invalid_number']
export function normalizedLeadPhone(value='') { return value.replace(/[^\d+]/g,'').replace(/^00/,'+') }
