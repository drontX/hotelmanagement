(() => {
  const types = {
    single: {
      name: 'Phòng đơn', beds: 1, bedLabel: '1 giường đơn', capacity: 1, price: 590_000, area: 18,
      description: 'Một giường đơn và một phòng vệ sinh khép kín có khu tắm.',
      image: 'ui/images/room-single.jpg',
    },
    double: {
      name: 'Phòng đôi', beds: 1, bedLabel: '1 giường đôi', capacity: 2, price: 890_000, area: 24,
      description: 'Một giường đôi và một phòng vệ sinh khép kín có khu tắm.',
      image: 'ui/images/room-double.jpg',
    },
    family: {
      name: 'Phòng gia đình', beds: 2, bedLabel: '2 giường đôi', capacity: 4, price: 1_390_000, area: 40,
      description: 'Hai giường đôi, nhà vệ sinh riêng và phòng tắm riêng.',
      image: 'ui/images/room-family.jpg',
    },
  };

  // Reuse the IDs from the previous demo so saved bookings still resolve to a room.
  const previousIds = { 103: 1, 205: 2, 105: 3, 203: 4, 305: 5, 104: 6 };
  const floors = Array.from({ length: 6 }, (_, index) => index + 1);

  window.hotelRoomTypes = types;
  window.hotelRooms = floors.flatMap((floor) => {
    const layout = floor === 6 ? Array(5).fill('single') : ['single', 'single', 'double', 'double', 'family'];
    return layout.map((typeId, index) => {
      const roomNumber = `${floor}0${index + 1}`;
      const previousId = previousIds[roomNumber];
      return {
        id: previousId ? `11111111-1111-4111-8111-11111111110${previousId}` : `room-${roomNumber}`,
        roomNumber,
        floor,
        typeId,
        status: roomNumber === '104' ? 'OCCUPIED' : roomNumber === '305' ? 'NEEDS_CLEANING' : 'EMPTY',
      };
    });
  });
})();
