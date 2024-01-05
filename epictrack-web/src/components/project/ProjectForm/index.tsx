import React from "react";
import { Grid } from "@mui/material";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { ETFormLabel } from "../../shared/index";
import codeService, { Code } from "../../../services/codeService";
import { Project, defaultProject } from "../../../models/project";
import { Proponent } from "../../../models/proponent";
import { Region } from "../../../models/region";
import { Type } from "../../../models/type";
import { SubType } from "../../../models/subtype";
import subTypeService from "../../../services/subTypeService";
import ControlledSelectV2 from "../../shared/controlledInputComponents/ControlledSelectV2";
import { MasterContext } from "../../shared/MasterContext";
import projectService from "../../../services/projectService/projectService";
import ControlledSwitch from "../../shared/controlledInputComponents/ControlledSwitch";
import { Palette } from "../../../styles/theme";
import ControlledTextField from "../../shared/controlledInputComponents/ControlledTextField";

import { ProponentSpecialField } from "./ProponentSpecialField";
import { ProjectNameSpecialField } from "./ProjectNameSpecialField";

const schema = yup.object().shape({
  name: yup
    .string()
    .required("Project Name is required")
    .test({
      name: "checkDuplicateProjectName",
      exclusive: true,
      message: "Project with the given name already exists",
      test: async (value, { parent }) => {
        if (value) {
          const validateProjectResult = await projectService.checkProjectExists(
            value,
            parent["id"]
          );
          return !(validateProjectResult.data as any)["exists"] as boolean;
        }
        return true;
      },
    }),
  type_id: yup.string().required("Type is required"),
  proponent_id: yup.string().required("Proponent is required"),
  sub_type_id: yup.string().required("SubType is required"),
  description: yup.string().required("Project Description is required"),
  address: yup.string().required("Location Description is required"),
  latitude: yup
    .number()
    .typeError("Please provide a numerial value")
    .required()
    .min(-90, "Latitude must be greater than or equal to -90")
    .max(90, "Latitude must be less than or equal to 90"),
  longitude: yup
    .number()
    .typeError("Please provide a numerial value")
    .required()
    .min(-180, "Longitude must be greater than or equal to -180")
    .max(180, "Longitude must be less than or equal to 180"),
});

export default function ProjectForm({ ...props }) {
  const [envRegions, setEnvRegions] = React.useState<Region[]>();
  const [nrsRegions, setNRSRegions] = React.useState<Region[]>();
  const [subTypes, setSubTypes] = React.useState<SubType[]>([]);
  const [types, setTypes] = React.useState<Type[]>([]);
  const [proponents, setProponents] = React.useState<Proponent[]>();
  const [disabled, setDisabled] = React.useState<boolean>();

  const [isProponentFieldLocked, setIsProponentFieldLocked] =
    React.useState<boolean>(false);

  const [isNameFieldLocked, setIsNameFieldLocked] =
    React.useState<boolean>(false);

  const ctx = React.useContext(MasterContext);

  const project = ctx?.item as Project;

  const isSpecialFieldLocked = isProponentFieldLocked || isNameFieldLocked;

  React.useEffect(() => {
    ctx.setDialogProps({
      saveButtonProps: {
        disabled: isSpecialFieldLocked,
      },
    });
  }, [isSpecialFieldLocked]);

  React.useEffect(() => {
    ctx.setFormId("project-form");
  }, []);

  React.useEffect(() => {
    setDisabled(props.projectId ? true : false);
    ctx.setId(props.projectId);
  }, [ctx.id]);

  const methods = useForm({
    resolver: yupResolver(schema),
    defaultValues: ctx.item as Project,
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setValue,
    setError,
    resetField,
  } = methods;
  const formValues = useWatch({ control });

  React.useEffect(() => {
    reset(ctx.item ?? defaultProject);
  }, [ctx.item]);

  React.useEffect(() => {
    const name = (ctx?.item as Project)?.name;
    ctx.setTitle(name || "Create Project");
  }, [ctx.title, ctx.item]);

  const setRegions = (regions: Region[]) => {
    const envRegions = regions.filter((p) => p.entity === "ENV");
    const nrsRegions = regions.filter((p) => p.entity === "FLNR");
    setEnvRegions(envRegions);
    setNRSRegions(nrsRegions);
  };
  const codeTypes: { [x: string]: any } = {
    regions: setRegions,
    types: setTypes,
    proponents: setProponents,
  };

  const getCodes = async (code: Code) => {
    const codeResult = await codeService.getCodes(code);
    if (codeResult.status === 200) {
      codeTypes[code]((codeResult.data as never)["codes"]);
    }
  };

  const getSubTypesByType = async () => {
    const subTypeResult = await subTypeService.getSubTypeByType(
      formValues.type_id
    );
    if (subTypeResult.status === 200) {
      setSubTypes(subTypeResult.data as SubType[]);
      // The subtype select box wasn't resetting when type changes
      if (formValues.sub_type_id !== (ctx.item as Project)?.sub_type_id) {
        reset({
          ...formValues,
          sub_type_id: undefined,
        });
      }
    }
  };

  React.useEffect(() => {
    if (formValues.type_id) {
      getSubTypesByType();
    }
  }, [formValues.type_id, ctx.item]);

  React.useEffect(() => {
    const promises: any[] = [];
    Object.keys(codeTypes).forEach(async (key) => {
      promises.push(getCodes(key as Code));
    });
    Promise.all(promises);
  }, []);

  const typeChange = () => {
    setValue("sub_type_id", undefined);
  };

  const onSubmitHandler = async (data: any) => {
    ctx.onSave(data, () => {
      reset();
    });
  };

  const onBlurProjectName = async () => {
    if (!formValues.name || Boolean(props.projectId)) return;

    try {
      const response = await projectService.createProjectAbbreviation(
        formValues.name
      );
      const generatedAbbreviation = response.data as string;
      resetField("abbreviation");
      setValue("abbreviation", generatedAbbreviation);
    } catch (error) {
      if (formValues.abbreviation) {
        return;
      }

      setError("abbreviation", {
        type: "manual",
        message: `Abbreviation could not be auto-generated for "${formValues.name}"`,
      });
    }
  };

  return (
    <>
      <FormProvider {...methods}>
        <Grid
          component={"form"}
          id="project-form"
          container
          spacing={2}
          sx={{
            margin: 0,
            width: "100%",
          }}
          onSubmit={handleSubmit(onSubmitHandler)}
        >
          <Grid
            container
            spacing={2}
            sx={{
              backgroundColor: Palette.neutral.bg.light,
              padding: "24px 40px",
            }}
          >
            <ProjectNameSpecialField
              id={project?.id}
              onLockClick={() => setIsNameFieldLocked((prev) => !prev)}
              open={isNameFieldLocked}
              onSave={() => {
                ctx.getById(project?.id.toString());
              }}
              title={project?.name}
            >
              <ControlledTextField
                name="name"
                placeholder="Project Name"
                disabled={disabled}
                variant="outlined"
                fullWidth
                onBlur={onBlurProjectName}
              />
            </ProjectNameSpecialField>
            <ProponentSpecialField
              id={project?.id}
              onLockClick={() => setIsProponentFieldLocked((prev) => !prev)}
              open={isProponentFieldLocked}
              onSave={() => {
                ctx.getById(project?.id.toString());
              }}
              options={proponents || []}
            >
              <ControlledSelectV2
                placeholder="Select"
                disabled={disabled}
                key={`proponent_select_${formValues.proponent_id}`}
                helperText={errors?.proponent_id?.message?.toString()}
                defaultValue={(ctx.item as Project)?.proponent_id}
                options={proponents || []}
                getOptionValue={(o: Proponent) => o?.id?.toString()}
                getOptionLabel={(o: Proponent) => o.name}
                {...register("proponent_id")}
              ></ControlledSelectV2>
            </ProponentSpecialField>
            <Grid item xs={6}>
              <ETFormLabel required>Type</ETFormLabel>
              <ControlledSelectV2
                onHandleChange={typeChange}
                placeholder="Select"
                key={`type_select_${formValues.type_id}`}
                helperText={errors?.type_id?.message?.toString()}
                defaultValue={(ctx.item as Project)?.type_id}
                options={types || []}
                getOptionValue={(o: Type) => o?.id?.toString()}
                getOptionLabel={(o: Type) => o.name}
                disabled={isSpecialFieldLocked}
                {...register("type_id")}
              ></ControlledSelectV2>
            </Grid>
            <Grid item xs={6}>
              <ETFormLabel required>Subtypes</ETFormLabel>
              <ControlledSelectV2
                placeholder="Select"
                key={`subtype_select_${formValues.sub_type_id}`}
                helperText={errors?.sub_type_id?.message?.toString()}
                defaultValue={(ctx.item as Project)?.sub_type_id}
                options={subTypes || []}
                getOptionValue={(o: SubType) => o?.id?.toString()}
                getOptionLabel={(o: SubType) => o.name}
                disabled={isSpecialFieldLocked}
                {...register("sub_type_id")}
              ></ControlledSelectV2>
            </Grid>
            <Grid item xs={12}>
              <ETFormLabel required>Project Description</ETFormLabel>
              <ControlledTextField
                name="description"
                fullWidth
                multiline
                rows={4}
                disabled={isSpecialFieldLocked}
              />
            </Grid>
          </Grid>
          <Grid
            container
            columnSpacing={2}
            rowSpacing={2}
            sx={{
              padding: "0px 40px 24px 40px",
              mt: 0,
              backgroundColor: Palette.white,
              borderTop: `1px solid ${Palette.neutral.bg.dark}`,
            }}
          >
            <Grid item xs={12}>
              <ETFormLabel required>Location Description</ETFormLabel>
              <ControlledTextField
                name="address"
                placeholder="Provide a detailed description of a project's location"
                fullWidth
                multiline
                rows={3}
                disabled={isSpecialFieldLocked}
              />
            </Grid>
            <Grid item xs={6}>
              <ETFormLabel>Latitude</ETFormLabel>
              <ControlledTextField
                name="latitude"
                type="number"
                inputProps={{
                  step: 0.000001,
                }}
                placeholder="e.g. 22.2222"
                fullWidth
                disabled={isSpecialFieldLocked}
              />
            </Grid>
            <Grid item xs={6}>
              <ETFormLabel>Longitude</ETFormLabel>
              <ControlledTextField
                name="longitude"
                type="number"
                inputProps={{
                  step: 0.00001,
                }}
                placeholder="e.g. -22.2222"
                fullWidth
                disabled={isSpecialFieldLocked}
              />
            </Grid>
            <Grid item xs={6}>
              <ETFormLabel>ENV Region</ETFormLabel>
              <ControlledSelectV2
                placeholder="Select"
                key={`env_select_${formValues.region_id_env}`}
                helperText={errors?.region_id_env?.message?.toString()}
                defaultValue={(ctx.item as Project)?.region_id_env}
                options={envRegions || []}
                getOptionValue={(o: Region) => o?.id?.toString()}
                getOptionLabel={(o: Region) => o?.name}
                disabled={isSpecialFieldLocked}
                {...register("region_id_env")}
              ></ControlledSelectV2>
            </Grid>
            <Grid item xs={6}>
              <ETFormLabel>NRS Region</ETFormLabel>
              <ControlledSelectV2
                placeholder="Select"
                key={`nrs_select_${formValues.region_id_flnro}`}
                helperText={errors?.region_id_flnro?.message?.toString()}
                defaultValue={(ctx.item as Project)?.region_id_flnro}
                options={nrsRegions || []}
                getOptionValue={(o: Region) => o?.id?.toString()}
                getOptionLabel={(o: Region) => o?.name}
                disabled={isSpecialFieldLocked}
                {...register("region_id_flnro")}
              ></ControlledSelectV2>
            </Grid>
          </Grid>
          <Grid
            container
            spacing={2}
            sx={{
              mt: 0,
              backgroundColor: Palette.neutral.bg.light,
              padding: "0px 40px 16px 40px",
              borderTop: `1px solid ${Palette.neutral.bg.dark}`,
            }}
          >
            <Grid item xs={6}>
              <ETFormLabel>Capital Investment</ETFormLabel>
              <ControlledTextField
                name="capital_investment"
                type="number"
                inputProps={{
                  min: 0,
                  step: 1,
                }}
                fullWidth
                disabled={isSpecialFieldLocked}
              />
            </Grid>
            <Grid item xs={6}>
              <ETFormLabel>EPIC GUID</ETFormLabel>
              <ControlledTextField
                name="epic_guid"
                fullWidth
                disabled={isSpecialFieldLocked}
              />
            </Grid>
            <Grid item xs={6}>
              <ETFormLabel>Est. FTE Positions in Construction</ETFormLabel>
              <ControlledTextField
                name="fte_positions_construction"
                type="number"
                inputProps={{
                  min: 0,
                  step: 1,
                }}
                fullWidth
                disabled={isSpecialFieldLocked}
              />
            </Grid>
            <Grid item xs={6}>
              <ETFormLabel>Est. FTE Positions in Operation</ETFormLabel>
              <ControlledTextField
                name="fte_positions_operation"
                type="number"
                inputProps={{
                  min: 0,
                  step: 1,
                }}
                fullWidth
                disabled={isSpecialFieldLocked}
              />
            </Grid>
            <Grid item xs={6}>
              <ETFormLabel>Certificate Number</ETFormLabel>
              <ControlledTextField
                name="ea_certificate"
                helperText
                fullWidth
                disabled={isSpecialFieldLocked}
              />
            </Grid>
            <Grid item xs={6}>
              <ETFormLabel>Abbreviation</ETFormLabel>
              <ControlledTextField
                name={"abbreviation"}
                helperText
                fullWidth
                placeholder="EDRMS retrieval code"
                inputEffects={(e) => e.target.value.toUpperCase()}
                disabled={isSpecialFieldLocked}
              />
            </Grid>
            <Grid
              item
              xs={3}
              sx={{
                paddingLeft: "0px",
              }}
            >
              <ControlledSwitch
                sx={{ paddingLeft: "0px", marginRight: "10px" }}
                name={"is_active"}
                disabled={isSpecialFieldLocked}
              />
              <ETFormLabel id="active">Active</ETFormLabel>
            </Grid>
            <Grid item xs={3}>
              <ControlledSwitch
                name={"is_project_closed"}
                sx={{ paddingLeft: "0px", marginRight: "10px" }}
                disabled={isSpecialFieldLocked}
              />
              <ETFormLabel id="active">Closed</ETFormLabel>
            </Grid>
          </Grid>
        </Grid>
      </FormProvider>
    </>
  );
}