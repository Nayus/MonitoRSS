/* eslint-disable no-nested-ternary */
import { CheckIcon, ChevronDownIcon, CloseIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  HStack,
  Heading,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalOverlay,
  SimpleGrid,
  Stack,
  Switch,
  Tag,
  Text,
  useDisclosure,
  chakra,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Spinner,
  Link,
  ModalCloseButton,
} from "@chakra-ui/react";
import { ChangeEvent, cloneElement, useEffect, useRef, useState } from "react";
import { useSubscriptionProducts } from "../../features/subscriptionProducts";
import { InlineErrorAlert } from "../InlineErrorAlert";
import { useUserMe } from "../../features/discordUser";
import { FAQ } from "../FAQ";
import { usePaddleCheckout } from "../../hooks";
import { ChangeSubscriptionDialog } from "../ChangeSubscriptionDialog";
import { ProductKey } from "../../constants";

interface Props {
  trigger: React.ReactElement;
}

enum Feature {
  Feeds = "Feeds",
  ArticleLimit = "Article Limit",
  Webhooks = "Webhooks",
  CustomPlaceholders = "Custom Placeholders",
  RefreshRate = "Refresh Rate",
}

const tiers: Array<{
  name: string;
  productId: string;
  disableSubscribe?: boolean;
  priceFormatted: string;
  description: string;
  highlighted?: boolean;
  features: Array<{ name: string; description: string; enabled?: boolean }>;
}> = [
  {
    name: "FREE",
    productId: ProductKey.Free,
    priceFormatted: "$0",
    disableSubscribe: true,
    description: "For basic news delivery",
    features: [
      {
        name: Feature.Feeds,
        description: "Track 5 news feeds",
        enabled: true,
      },
      {
        name: Feature.ArticleLimit,
        description: "Limit of 50 articles daily",
        enabled: true,
      },
      {
        name: Feature.Webhooks,
        description: "Custom name/avatar with webhooks",
      },
      {
        name: Feature.CustomPlaceholders,
        description: "Custom placeholders",
      },
      {
        name: Feature.RefreshRate,
        description: "10 minute refresh rate",
      },
    ],
  },
  {
    name: "TIER 1",
    productId: ProductKey.Tier1,
    priceFormatted: "$5",
    description: "For customized deliveries",
    features: [
      {
        name: Feature.Feeds,
        description: "Track 15 news feeds",
        enabled: true,
      },
      {
        name: Feature.ArticleLimit,
        description: "Limit of 200 articles daily",
        enabled: true,
      },
      {
        name: Feature.Webhooks,
        description: "Custom name/avatar with webhooks",
        enabled: true,
      },
      {
        name: Feature.CustomPlaceholders,
        description: "Custom placeholders",
        enabled: true,
      },
      {
        name: Feature.RefreshRate,
        description: "10 minute refresh rate",
      },
    ],
  },
  {
    name: "TIER 2",
    productId: ProductKey.Tier2,
    priceFormatted: "$10",
    description: "For time-sensitive deliveries",
    highlighted: true,
    features: [
      {
        name: Feature.Feeds,
        description: "Track 40 news feeds",
        enabled: true,
      },
      {
        name: Feature.ArticleLimit,
        description: "Limit of 500 articles daily",
        enabled: true,
      },
      {
        name: Feature.Webhooks,
        description: "Custom name/avatar with webhooks",
        enabled: true,
      },
      {
        name: Feature.CustomPlaceholders,
        description: "Custom placeholders",
        enabled: true,
      },
      {
        name: Feature.RefreshRate,
        description: "2 minute refresh rate",
        enabled: true,
      },
    ],
  },
  {
    name: "TIER 3",
    productId: ProductKey.Tier3,
    priceFormatted: "$20",
    description: "For power users",
    features: [
      {
        name: Feature.Feeds,
        description: "Track 100 news feeds",
        enabled: true,
      },
      {
        name: Feature.ArticleLimit,
        description: "Limit of 1000 articles daily",
        enabled: true,
      },
      {
        name: Feature.Webhooks,
        description: "Custom name/avatar with webhooks",
        enabled: true,
      },
      {
        name: Feature.CustomPlaceholders,
        description: "Custom placeholders",
        enabled: true,
      },
      {
        name: Feature.RefreshRate,
        description: "2 minute refresh rate",
        enabled: true,
      },
    ],
  },
];

const getIdealPriceTextSize = (length: number) => {
  if (length < 10) {
    return "6xl";
  }

  if (length < 11) {
    return "5xl";
  }

  return "4xl";
};

const CurrencyDisplay = ({
  code,
  symbol,
  minimizeGap,
}: {
  code: string;
  symbol: string;
  minimizeGap?: boolean;
}) => {
  return (
    <span>
      <chakra.span
        fontSize="lg"
        fontWeight="bold"
        width={minimizeGap ? undefined : "3rem"}
        display="inline-block"
        mr={minimizeGap ? 4 : 2}
        whiteSpace="nowrap"
      >
        {symbol}
      </chakra.span>
      <chakra.span fontSize="lg" fontWeight="semibold">
        {code}
      </chakra.span>
    </span>
  );
};

const initialCurrencyCode = localStorage.getItem("currency") || "USD";
const initialCurrencySymbol = localStorage.getItem("currencySymbol") || "$";
const initialInterval =
  (localStorage.getItem("preferredPricingInterval") as "month" | "year") || "month";

interface ChangeSubscriptionDetails {
  priceId: string;
  productId: string;
  isDowngrade?: boolean;
}

export const PricingDialog = ({ trigger }: Props) => {
  const [checkForSubscriptionCreated, setCheckForSubscriptionCreated] = useState(false);
  const {
    status: userStatus,
    error: userError,
    data: userData,
  } = useUserMe({
    checkForSubscriptionCreated,
  });
  const { onOpen, onClose, isOpen } = useDisclosure();
  const [interval, setInterval] = useState<"month" | "year">(initialInterval);
  const [currency, setCurrency] = useState({
    code: initialCurrencyCode,
    symbol: initialCurrencySymbol,
  });
  const { data, fetchStatus, status, error } = useSubscriptionProducts({
    currency: currency.code,
  });
  const [changeSubscriptionDetails, setChangeSubscriptionDetails] =
    useState<ChangeSubscriptionDetails>();
  const paidSubscriptionExists =
    userData && userData?.result.subscription.product.key !== ProductKey.Free;
  const userBillingInterval = userData?.result.subscription.billingInterval;

  const onCheckoutSuccess = () => {
    setCheckForSubscriptionCreated(true);
  };

  const { openCheckout } = usePaddleCheckout({
    onCheckoutSuccess,
  });
  const initialFocusRef = useRef<HTMLInputElement>(null);

  const onChangeInterval = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setInterval("year");
      localStorage.setItem("preferredPricingInterval", "year");
    } else {
      setInterval("month");
      localStorage.setItem("preferredPricingInterval", "month");
    }
  };

  const onChangeCurrency = (c: { code: string; symbol: string }) => {
    setCurrency(c);
    localStorage.setItem("currency", c.code);
    localStorage.setItem("currencySymbol", c.symbol);
  };

  const currencyElements = data?.data.currencies.map((c) => (
    <MenuItem key={c.code} onClick={() => onChangeCurrency(c)}>
      <CurrencyDisplay code={c.code} symbol={c.symbol} />
    </MenuItem>
  ));

  const onClickPrice = (
    priceId?: string,
    currencyCode?: string,
    productId?: string,
    isDowngrade?: boolean
  ) => {
    if (!priceId || !currencyCode || !productId || !userData) {
      return;
    }

    onClose();

    if (userData.result.subscription.product.key === ProductKey.Free) {
      openCheckout({
        priceId,
      });
    } else {
      setChangeSubscriptionDetails({
        priceId,
        productId,
        isDowngrade,
      });
    }
  };

  useEffect(() => {
    if (status === "success") {
      initialFocusRef.current?.focus();
    }
  }, [status, initialFocusRef.current]);

  useEffect(() => {
    if (checkForSubscriptionCreated && paidSubscriptionExists) {
      setCheckForSubscriptionCreated(false);
    }
  }, [checkForSubscriptionCreated, paidSubscriptionExists]);

  useEffect(() => {
    if (userBillingInterval) {
      setInterval(userBillingInterval);
    }
  }, [userBillingInterval]);

  const products = data?.data.products;

  const biggestPriceLength = data
    ? Math.max(
        ...(products?.flatMap((pr) =>
          pr.prices.filter((p) => p.interval === interval).map((p) => p.formattedPrice.length)
        ) || []),
        0
      )
    : 4;

  const priceTextSize = getIdealPriceTextSize(biggestPriceLength);
  const userSubscription = userData?.result.subscription;
  const userTierIndex = tiers?.findIndex((p) => p.productId === userSubscription?.product.key);

  if (checkForSubscriptionCreated) {
    return (
      <Stack
        backdropFilter="blur(3px)"
        alignItems="center"
        justifyContent="center"
        height="100vh"
        position="absolute"
        background="blackAlpha.700"
        top={0}
        left={0}
        width="100vw"
        zIndex={10}
      >
        <Spinner />
        <Text>Provisioning benefits...</Text>
      </Stack>
    );
  }

  return (
    <Box>
      <ChangeSubscriptionDialog
        currencyCode={currency.code}
        isDowngrade={changeSubscriptionDetails?.isDowngrade}
        details={
          changeSubscriptionDetails
            ? {
                priceId: changeSubscriptionDetails.priceId,
              }
            : undefined
        }
        onClose={(reopenPricing) => {
          setChangeSubscriptionDetails(undefined);

          if (reopenPricing) {
            onOpen();
          }
        }}
      />
      {cloneElement(trigger, {
        onClick: () => onOpen(),
      })}
      <Modal
        onClose={onClose}
        isOpen={isOpen}
        isCentered
        size="full"
        initialFocusRef={initialFocusRef}
        motionPreset="slideInBottom"
        scrollBehavior="outside"
      >
        <ModalOverlay backdropFilter="blur(3px)" />
        <ModalContent bg="blackAlpha.700" shadow="none" maxHeight="100vh" overflowY="scroll">
          <ModalCloseButton />
          <ModalBody bg="transparent" shadow="none">
            <Box>
              <Stack>
                <Flex alignItems="center" justifyContent="center">
                  <Stack width="100%" alignItems="center" spacing={12}>
                    <Stack justifyContent="center" textAlign="center">
                      <Heading>Pricing</Heading>
                      <Text color="whiteAlpha.800" fontSize="lg" fontWeight="light">
                        Support MonitoRSS&apos;s open-source development and public hosting in
                        exchange for some upgrades!
                      </Text>
                    </Stack>
                    {(status === "loading" || userStatus === "loading") && <Spinner mb={8} />}
                    {(error || userError) && (
                      <Stack mb={4}>
                        <InlineErrorAlert
                          title="Sorry, something went werong"
                          description={(error || userError)?.message}
                        />
                      </Stack>
                    )}
                    {!error && !userError && data && userSubscription && (
                      <>
                        <Stack>
                          <HStack alignItems="center" spacing={4}>
                            <Text fontSize="lg" fontWeight="semibold">
                              Monthly
                            </Text>
                            <Switch
                              size="lg"
                              colorScheme="green"
                              onChange={onChangeInterval}
                              ref={initialFocusRef}
                              isChecked={interval === "year"}
                            />
                            <Text fontSize="lg" fontWeight="semibold">
                              Yearly
                            </Text>
                          </HStack>
                          <Text color="green.300">Save 10% with a yearly plan!</Text>
                        </Stack>
                        {userData.result.subscription.product.key === ProductKey.Free && (
                          <Menu>
                            <MenuButton
                              as={Button}
                              width={[200]}
                              rightIcon={<ChevronDownIcon />}
                              textAlign="left"
                            >
                              <CurrencyDisplay
                                minimizeGap
                                code={currency.code}
                                symbol={currency.symbol}
                              />
                            </MenuButton>
                            <MenuList maxHeight="300px" overflow="auto">
                              {currencyElements}
                            </MenuList>
                          </Menu>
                        )}
                        <SimpleGrid
                          justifyContent="center"
                          gridTemplateColumns={[
                            "350px",
                            "450px",
                            "350px 350px",
                            "350px 350px",
                            "350px 350px 350px",
                            "350px 350px 350px 350px",
                          ]}
                          spacing={4}
                          width="100%"
                        >
                          {tiers.map(
                            (
                              {
                                name,
                                description,
                                priceFormatted,
                                highlighted,
                                features,
                                productId,
                              },
                              currentTierIndex
                            ) => {
                              const associatedProduct = products?.find((p) => p.id === productId);

                              const associatedPrice = associatedProduct?.prices.find(
                                (p) => p.interval === interval
                              );

                              const shorterProductPrice = associatedPrice?.formattedPrice.endsWith(
                                ".00"
                              ) ? (
                                <Text fontSize={priceTextSize} fontWeight="bold">
                                  {associatedPrice?.formattedPrice.slice(0, -3)}
                                </Text>
                              ) : (
                                associatedPrice?.formattedPrice
                              );

                              const isOnThisTier =
                                userSubscription.product.key === productId &&
                                userSubscription.billingInterval === interval;
                              const isAboveUserTier =
                                userTierIndex < currentTierIndex ||
                                (userSubscription.product.key === productId &&
                                  userSubscription.billingInterval !== interval &&
                                  userSubscription.billingInterval === "month");
                              const isBelowUserTier =
                                userTierIndex > currentTierIndex ||
                                (userSubscription.product.key === productId &&
                                  userSubscription.billingInterval !== interval &&
                                  userSubscription.billingInterval === "year");

                              return (
                                <Card size="lg" shadow="lg" key={name}>
                                  <CardHeader pb={0}>
                                    <Stack>
                                      <HStack justifyContent="flex-start">
                                        <Heading size="md" fontWeight="semibold">
                                          {name}
                                        </Heading>
                                        {highlighted && (
                                          <Tag size="sm" colorScheme="blue" fontWeight="bold">
                                            Most Popular
                                          </Tag>
                                        )}
                                      </HStack>
                                      <Text color="whiteAlpha.600" fontSize="lg">
                                        {description}
                                      </Text>
                                    </Stack>
                                  </CardHeader>
                                  <CardBody>
                                    <Stack spacing="12">
                                      <Box>
                                        <Text fontSize={priceTextSize} fontWeight="bold">
                                          {fetchStatus === "fetching" && (
                                            <Spinner
                                              colorScheme="blue"
                                              color="blue.300"
                                              size="lg"
                                            />
                                          )}
                                          {fetchStatus !== "fetching" &&
                                            (shorterProductPrice || "N/A")}
                                        </Text>
                                        <Text fontSize="lg" color="whiteAlpha.600">
                                          {interval === "month" && "per month"}
                                          {interval === "year" && "per year"}
                                        </Text>
                                      </Box>
                                      <Stack>
                                        {features.map((f) => {
                                          return (
                                            <HStack key={f.name}>
                                              {f.enabled ? (
                                                <Flex bg="blue.500" rounded="full" p={1}>
                                                  <CheckIcon fontSize="md" width={3} height={3} />
                                                </Flex>
                                              ) : (
                                                // </Box>
                                                <Flex bg="whiteAlpha.600" rounded="full" p={1.5}>
                                                  <CloseIcon width={2} height={2} fontSize="sm" />
                                                </Flex>
                                              )}
                                              <Text fontSize="lg">{f.description}</Text>
                                            </HStack>
                                          );
                                        })}
                                      </Stack>
                                    </Stack>
                                  </CardBody>
                                  <CardFooter justifyContent="center">
                                    <Button
                                      isDisabled={isOnThisTier}
                                      width="100%"
                                      onClick={() =>
                                        onClickPrice(
                                          associatedPrice?.id,
                                          currency.code,
                                          productId,
                                          isBelowUserTier
                                        )
                                      }
                                      variant={
                                        isOnThisTier
                                          ? "outline"
                                          : isAboveUserTier
                                          ? "solid"
                                          : "outline"
                                      }
                                      colorScheme={
                                        isAboveUserTier
                                          ? "blue"
                                          : isBelowUserTier
                                          ? "red"
                                          : undefined
                                      }
                                    >
                                      {isOnThisTier && "Current Plan"}
                                      {isBelowUserTier && "Downgrade"}
                                      {isAboveUserTier && "Upgrade"}
                                    </Button>
                                  </CardFooter>
                                </Card>
                              );
                            }
                          )}
                        </SimpleGrid>
                      </>
                    )}
                  </Stack>
                </Flex>
                <Text textAlign="center" color="whiteAlpha.600">
                  By proceeding to payment, you are agreeing to our{" "}
                  <Link target="_blank" href="https://monitorss.xyz/terms" color="blue.300">
                    terms and conditions
                  </Link>{" "}
                  as well as our{" "}
                  <Link
                    target="_blank"
                    color="blue.300"
                    href="https://monitorss.xyz/privacy-policy"
                  >
                    privacy policy
                  </Link>
                  .<br />
                  The checkout process is handled by our reseller and Merchant of Record,
                  Paddle.com, who also handles subscription-related inquiries. Prices will be
                  localized your location.
                </Text>
              </Stack>
              <Stack justifyContent="center" width="100%" alignItems="center">
                <Stack mt={16} maxW={1400} width="100%">
                  <FAQ
                    items={[
                      {
                        q: "Can I switch between plans?",
                        a: (
                          <Text>
                            Yes! You can easily upgrade or downgrade your plan, at any time. If you
                            upgrade, the amount you have already paid for the current period will be
                            pro-rated and applied to the new plan. If you downgrade, the amount you
                            have already paid for the current period will be pro-rated and applied
                            as a credit to the new plan.
                          </Text>
                        ),
                      },
                      {
                        q: "Can I cancel my subscription at any time?",
                        a: (
                          <Text>
                            Yes, you can cancel your subscription at any time from your account
                            page. Your subscription will remain active until the end of the period
                            you have paid for, and will then expire with no further charges.
                          </Text>
                        ),
                      },
                      {
                        q: "Can I get a refund?",
                        a: (
                          <Text>
                            We may offer a refund on a case-by-case basis depending on the
                            situation. For more information, please see our{" "}
                            <Link
                              color="blue.300"
                              target="_blank"
                              href="https://monitorss.xyz/terms"
                            >
                              Terms and Conditions
                            </Link>
                            . In any case, please do not hesitate to contact us if you have any
                            questions or concerns.
                          </Text>
                        ),
                      },
                      {
                        q: "How many Discord servers does my subscription apply to?",
                        a: (
                          <Text>
                            Your subscription applies to all the feeds that you own, regardless of
                            what server it is in.
                          </Text>
                        ),
                      },
                      {
                        q: "What if I have more requirements?",
                        a: (
                          <Text>
                            Please contact us at{" "}
                            <Link
                              color="blue.300"
                              href="mailto:support@monitorss.xyz?subject=Custom%20Plan%20Inquiry"
                            >
                              support@monitorss.xyz
                            </Link>{" "}
                            and we will be happy to discuss a custom plan.
                          </Text>
                        ),
                      },
                    ]}
                  />
                </Stack>
              </Stack>
            </Box>
          </ModalBody>
          <ModalFooter justifyContent="center" mb={24} mt={6}>
            <Button onClick={onClose} width="lg" variant="outline">
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};