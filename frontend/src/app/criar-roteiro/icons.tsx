import {
  ArrowLeft,
  MagnifyingGlass,
  Plus,
  Car,
  PersonSimpleWalk,
  Bicycle,
  Bus,
  Lightbulb,
  MapPin,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";

export function BackArrowIcon() {
  return <ArrowLeft size={18} weight="bold" />;
}

export function SearchIcon() {
  return <MagnifyingGlass size={18} />;
}

export function PlusIcon() {
  return <Plus size={14} weight="bold" />;
}

export function CarIcon() {
  return <Car size={26} />;
}

export function WalkIcon() {
  return <PersonSimpleWalk size={26} />;
}

export function BikeIcon() {
  return <Bicycle size={26} />;
}

export function BusIcon() {
  return <Bus size={26} />;
}

export function BulbIcon() {
  return <Lightbulb size={20} />;
}

export function PinIcon({ color = "#EF4444" }: { color?: string }) {
  return <MapPin size={30} weight="fill" color={color} />;
}

export function CheckIcon() {
  return <CheckCircle size={18} weight="fill" color="#16a34a" />;
}

export function WarningIcon() {
  return <WarningCircle size={16} weight="fill" color="#dc2626" />;
}