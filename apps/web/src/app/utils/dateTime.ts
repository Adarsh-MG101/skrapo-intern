export const TIME_SLOTS = [
  { value: "any", label: "Any time slot" },
  { value: "08-10", label: "8-10 AM" },
  { value: "10-12", label: "10 AM - 12 PM" },
  { value: "14-16", label: "2 - 4 PM" },
  { value: "16-18", label: "4 - 6 PM" }
];

export const getTimeSlotLabel = (value: string) => {
  const slot = TIME_SLOTS.find(s => s.value === value);
  return slot ? slot.label : value;
};
