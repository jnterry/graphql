/*
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
    DefinitionNode,
    DocumentNode,
    GraphQLSchema,
    extendSchema,
    validateSchema,
    ObjectTypeDefinitionNode,
    InputValueDefinitionNode,
    FieldDefinitionNode,
    TypeNode,
    specifiedDirectives,
    Kind,
} from "graphql";
import pluralize from "pluralize";
import * as scalars from "../types/scalars";
import * as enums from "./enums";
import * as directives from "./directives";
import { Point } from "../types/objects/Point";
import { CartesianPoint } from "../types/objects/CartesianPoint";
import { PointInput } from "../types/input-objects/PointInput";
import { CartesianPointInput } from "../types/input-objects/CartesianPointInput";
import { PointDistance } from "../types/input-objects/PointDistance";
import { CartesianPointDistance } from "../types/input-objects/CartesianPointDistance";
import { RESERVED_TYPE_NAMES } from "../../constants";
import { isRootType } from "../../utils/is-root-type";

function filterDocument(document: DocumentNode): DocumentNode {
    const nodeNames = document.definitions
        .filter((definition) => {
            if (
                definition.kind === "ObjectTypeDefinition" ||
                definition.kind === "ScalarTypeDefinition" ||
                definition.kind === "InterfaceTypeDefinition" ||
                definition.kind === "UnionTypeDefinition" ||
                definition.kind === "EnumTypeDefinition" ||
                definition.kind === "InputObjectTypeDefinition"
            ) {
                RESERVED_TYPE_NAMES.forEach((reservedName) => {
                    if (reservedName.regex.test(definition.name.value)) {
                        throw new Error(reservedName.error);
                    }
                });
            }

            if (definition.kind === "ObjectTypeDefinition") {
                if (!isRootType(definition)) {
                    return true;
                }
            }
            return false;
        })
        .map((definition) => (definition as ObjectTypeDefinitionNode).name.value);

    const getArgumentType = (type: TypeNode): string => {
        if (type.kind === Kind.LIST_TYPE) {
            return getArgumentType(type.type);
        }

        if (type.kind === Kind.NON_NULL_TYPE) {
            return getArgumentType(type.type);
        }

        return type.name.value;
    };

    const filterInputTypes = (fields: readonly InputValueDefinitionNode[] | undefined) => {
        return fields?.filter((f) => {
            const type = getArgumentType(f.type);

            const nodeMatch =
                /(?<nodeName>.+)(?:ConnectInput|ConnectWhere|CreateInput|DeleteInput|DisconnectInput|Options|RelationInput|Sort|UpdateInput|Where)/gm.exec(
                    type
                );
            if (nodeMatch?.groups?.nodeName) {
                if (nodeNames.includes(nodeMatch.groups.nodeName)) {
                    return false;
                }
            }

            return true;
        });
    };

    const filterFields = (fields: readonly FieldDefinitionNode[] | undefined) => {
        return fields
            ?.filter((f) => {
                const type = getArgumentType(f.type);
                const match = /(?:Create|Update)(?<nodeName>.+)MutationResponse/gm.exec(type);
                if (match?.groups?.nodeName) {
                    if (nodeNames.map((nodeName) => pluralize(nodeName)).includes(match.groups.nodeName)) {
                        return false;
                    }
                }
                return true;
            })
            .map((f) => ({
                ...f,
                arguments: filterInputTypes(f.arguments),
                directives: f.directives?.filter((x) => !["auth"].includes(x.name.value)),
            }));
    };

    return {
        ...document,
        definitions: document.definitions.reduce((res: DefinitionNode[], def) => {
            if (def.kind === "InputObjectTypeDefinition") {
                const fields = filterInputTypes(def.fields);

                if (!fields?.length) {
                    return res;
                }

                return [
                    ...res,
                    {
                        ...def,
                        fields,
                    },
                ];
            }

            if (def.kind === "ObjectTypeDefinition" || def.kind === "InterfaceTypeDefinition") {
                const fields = filterFields(def.fields);

                if (!fields?.length) {
                    return res;
                }

                return [
                    ...res,
                    {
                        ...def,
                        directives: def.directives?.filter((x) => !["auth"].includes(x.name.value)),
                        fields,
                    },
                ];
            }

            return [...res, def];
        }, []),
    };
}

function validateDocument(document: DocumentNode): void {
    const doc = filterDocument(document);

    const schemaToExtend = new GraphQLSchema({
        directives: [...Object.values(directives), ...specifiedDirectives],
        types: [
            ...Object.values(scalars),
            ...Object.values(enums),
            Point,
            CartesianPoint,
            PointInput,
            PointDistance,
            CartesianPointInput,
            CartesianPointDistance,
        ],
    });

    const schema = extendSchema(schemaToExtend, doc);

    const errors = validateSchema(schema);

    const filteredErrors = errors.filter((e) => e.message !== "Query root type must be provided.");

    if (filteredErrors.length) {
        throw new Error(filteredErrors.join("\n"));
    }
}

export default validateDocument;
