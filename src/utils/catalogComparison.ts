import type {
  MemberSubscription,
  MembershipPackage,
} from "../types/membership";

export type CatalogComparisonPlan = {
  key: string;
  packageId: string;
  name: string;
  price: number;
  durationMonths: number;
  benefits: string[];
  isCurrent: boolean;
};

export function buildCatalogComparisonPlans(
  currentSubscription: MemberSubscription | null,
  selectedPackages: MembershipPackage[],
): CatalogComparisonPlan[] {
  const currentPlan = currentSubscription
    ? [{
        key: `current:${currentSubscription.id}`,
        packageId: currentSubscription.packageId,
        name: currentSubscription.packageName,
        price: currentSubscription.packagePrice,
        durationMonths: currentSubscription.durationMonths,
        benefits: currentSubscription.benefits,
        isCurrent: true,
      }]
    : [];
  return [
    ...currentPlan,
    ...selectedPackages
      .filter((pkg) => pkg.id !== currentSubscription?.packageId)
      .map((pkg) => ({
        key: `package:${pkg.id}`,
        packageId: pkg.id,
        name: pkg.name,
        price: pkg.price,
        durationMonths: pkg.durationMonths,
        benefits: pkg.benefits ?? [],
        isCurrent: false,
      })),
  ];
}
