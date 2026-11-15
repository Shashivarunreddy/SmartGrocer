// In-memory guest browsing session tracker
let isGuest = false;

export const setGuestSession = (active: boolean) => {
  isGuest = active;
};

export const isGuestSession = () => isGuest;

