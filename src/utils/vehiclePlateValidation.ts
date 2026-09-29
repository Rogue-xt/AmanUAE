import type { VehicleProfile } from "@/src/context/AppContext";

export type NormalizedVehiclePlate = Pick<
  VehicleProfile,
  "emirate" | "plateCode" | "plateNumber"
>;

export type VehiclePlateErrors = {
  plateCode?: string;
  plateNumber?: string;
};

export function normalizeVehiclePlate(
  emirate: VehicleProfile["emirate"],
  plateCode: string,
  plateNumber: string,
): NormalizedVehiclePlate {
  return {
    emirate,
    plateCode: plateCode.trim().toUpperCase(),
    plateNumber: plateNumber.trim(),
  };
}

export function validateVehiclePlate(
  plate: NormalizedVehiclePlate,
): VehiclePlateErrors {
  const errors: VehiclePlateErrors = {};

  if (!plate.plateCode) {
    errors.plateCode = "Enter your plate code/category.";
  } else if (!/^[A-Z0-9]+$/.test(plate.plateCode)) {
    errors.plateCode = "Plate code/category should use letters and numbers only.";
  }

  if (!plate.plateNumber) {
    errors.plateNumber = "Enter your plate number.";
  } else if (!/^\d+$/.test(plate.plateNumber)) {
    errors.plateNumber = "Plate number should contain digits only.";
  }

  return errors;
}

export function hasVehiclePlateErrors(errors: VehiclePlateErrors): boolean {
  return Boolean(errors.plateCode || errors.plateNumber);
}

export function isSameVehiclePlate(
  first: NormalizedVehiclePlate,
  second: NormalizedVehiclePlate,
): boolean {
  return (
    first.emirate === second.emirate &&
    first.plateCode === second.plateCode &&
    first.plateNumber === second.plateNumber
  );
}

export function isDuplicateVehiclePlate(
  vehicles: VehicleProfile[],
  plate: NormalizedVehiclePlate,
  excludedVehicleId?: string,
): boolean {
  return vehicles.some((vehicle) => {
    if (vehicle.id === excludedVehicleId) return false;

    const existingPlate = normalizeVehiclePlate(
      vehicle.emirate,
      vehicle.plateCode,
      vehicle.plateNumber,
    );

    return isSameVehiclePlate(existingPlate, plate);
  });
}
