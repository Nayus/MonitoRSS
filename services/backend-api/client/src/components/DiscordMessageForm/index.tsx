import { AddIcon } from '@chakra-ui/icons';
import {
  Button,
  Flex,
  Heading,
  HStack,
  IconButton,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import {
  FormProvider, useFieldArray, useForm,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  DiscordMessageEmbedFormData,
  DiscordMessageFormData,
  discordMessageFormSchema,
} from '@/types/discord';
import { notifyError } from '../../utils/notifyError';
import { DiscordMessageContentForm } from './DiscordMessageContentForm';
import { DiscordMessageEmbedForm } from './DiscordMessageEmbedForm';

interface Props {
  defaultValues?: DiscordMessageFormData
  onClickSave: (data: DiscordMessageFormData) => Promise<void>
}

const templateEmbed: DiscordMessageEmbedFormData = Object.freeze({
  embedAuthorIconUrl: '',
  embedAuthorTitle: '',
  embedAuthorUrl: '',
  embedColor: undefined,
  embedDescription: '',
  embedFooterIconUrl: '',
  embedFooterText: '',
  embedImageUrl: '',
  embedThumbnailUrl: '',
  embedTitle: '',
  embedUrl: '',
});

export const DiscordMessageForm = ({
  defaultValues,
  onClickSave,
}: Props) => {
  const { t } = useTranslation();
  const [activeEmbedIndex, setActiveEmbedIndex] = useState(defaultValues?.embeds?.length ?? 0);

  const formMethods = useForm<DiscordMessageFormData>({
    resolver: yupResolver(discordMessageFormSchema),
    defaultValues,
    mode: 'onChange',
  });
  const {
    handleSubmit,
    control,
    reset,
    formState: {
      isDirty,
      isSubmitting,
      errors,
    },
  } = formMethods;
  const {
    fields: embeds,
    append,
    remove,
  } = useFieldArray({
    control,
    name: 'embeds',
  });

  const onSubmit = async (formData: DiscordMessageFormData) => {
    try {
      await onClickSave(formData);
      reset(formData);
    } catch (err) {
      notifyError(t('common.errors.somethingWentWrong'), err as Error);
    }
  };

  const onAddEmbed = () => {
    append(templateEmbed as never);
    setActiveEmbedIndex(embeds.length);
  };

  const onRemoveEmbed = (index: number) => {
    remove(index);
    const newIndex = Math.max(index - 1, 0);
    setActiveEmbedIndex(newIndex);
  };

  const onEmbedTabChanged = (index: number) => {
    setActiveEmbedIndex(index);
  };

  const errorsExist = Object.keys(errors).length > 0;

  return (
    <FormProvider {...formMethods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={16}>
          <Stack spacing={4}>
            <Heading size="md">Text</Heading>
            <DiscordMessageContentForm
              control={control}
              errors={errors}
            />
          </Stack>
          <Stack spacing={4}>
            <Heading size="md">Embeds</Heading>
            <Tabs
              variant="soft-rounded"
              index={activeEmbedIndex}
              onChange={onEmbedTabChanged}
            >
              <HStack overflow="auto">
                <TabList>
                  {embeds?.map((embed, index) => (
                    <Tab key={embed.id}>
                      Embed
                      {' '}
                      {index + 1}
                    </Tab>
                  ))}
                </TabList>
                {(embeds?.length ?? 0) < 10 && (
                <IconButton
                  onClick={onAddEmbed}
                  variant="ghost"
                  aria-label="Add new embed"
                  icon={<AddIcon />}
                />
                )}
              </HStack>
              <TabPanels>
                {embeds?.map((embed, index) => (
                  <TabPanel key={embed.id}>
                    <Flex justifyContent="flex-end">
                      <Button
                        colorScheme="red"
                        size="sm"
                        variant="outline"
                        onClick={() => onRemoveEmbed(index)}
                      >
                        {t('features.feedConnections.components.embedForm.deleteButtonText')}
                      </Button>
                    </Flex>
                    <DiscordMessageEmbedForm
                      index={index}
                    />
                  </TabPanel>
                ))}
              </TabPanels>
            </Tabs>
          </Stack>
          <Flex direction="row-reverse">
            <HStack>
              {isDirty && (
              <Button
                onClick={() => reset()}
                variant="ghost"
                disabled={!isDirty || isSubmitting}
              >
                {t('features.feed.components.sidebar.resetButton')}
              </Button>
              )}
              <Button
                type="submit"
                colorScheme="blue"
                disabled={isSubmitting || !isDirty || errorsExist}
                isLoading={isSubmitting}
              >
                {t('features.feed.components.sidebar.saveButton')}
              </Button>
            </HStack>
          </Flex>
        </Stack>
      </form>
    </FormProvider>
  );
};