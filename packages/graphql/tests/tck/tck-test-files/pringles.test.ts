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

import { Neo4jGraphQLAuthJWTPlugin } from "@neo4j/graphql-plugin-auth";
import { gql } from "apollo-server";
import { DocumentNode } from "graphql";
import { Neo4jGraphQL } from "../../../src";
import { createJwtRequest } from "../../utils/create-jwt-request";
import { formatCypher, translateQuery, formatParams } from "../utils/tck-test-utils";

describe("Cypher Create Pringles", () => {
    const secret = "secret";
    let typeDefs: DocumentNode;
    let neoSchema: Neo4jGraphQL;

    beforeAll(() => {
        typeDefs = gql`
            type Product {
                id: ID!
                name: String
                sizes: [Size!]! @relationship(type: "HAS_SIZE", direction: OUT)
                colors: [Color!]! @relationship(type: "HAS_COLOR", direction: OUT)
                photos: [Photo!]! @relationship(type: "HAS_PHOTO", direction: OUT)
            }

            type Size {
                id: ID!
                name: String!
            }

            type Color {
                id: ID!
                name: String!
                photos: [Photo!]! @relationship(type: "OF_COLOR", direction: IN)
            }

            type Photo {
                id: ID!
                description: String!
                url: String!
                color: Color! @relationship(type: "OF_COLOR", direction: OUT)
            }
        `;

        neoSchema = new Neo4jGraphQL({
            typeDefs,
            config: { enableRegex: true },
            plugins: {
                auth: new Neo4jGraphQLAuthJWTPlugin({
                    secret: "secret",
                }),
            },
        });
    });

    test("Create Pringles", async () => {
        const query = gql`
            mutation {
                createProducts(
                    input: [
                        {
                            id: 1
                            name: "Pringles"
                            sizes: {
                                create: [{ node: { id: 103, name: "Small" } }, { node: { id: 104, name: "Large" } }]
                            }
                            colors: {
                                create: [{ node: { id: 100, name: "Red" } }, { node: { id: 102, name: "Green" } }]
                            }
                            photos: {
                                create: [
                                    { node: { id: 105, description: "Outdoor photo", url: "outdoor.png" } }
                                    {
                                        node: {
                                            id: 106
                                            description: "Green photo"
                                            url: "g.png"
                                            color: { connect: { where: { node: { id: "102" } } } }
                                        }
                                    }
                                    {
                                        node: {
                                            id: 107
                                            description: "Red photo"
                                            url: "r.png"
                                            color: { connect: { where: { node: { id: "100" } } } }
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                ) {
                    products {
                        id
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "CALL {
            CREATE (this0:Product)
            SET this0.id = $this0_id
            SET this0.name = $this0_name
            WITH this0
            CREATE (this0_sizes0_node:Size)
            SET this0_sizes0_node.id = $this0_sizes0_node_id
            SET this0_sizes0_node.name = $this0_sizes0_node_name
            MERGE (this0)-[:HAS_SIZE]->(this0_sizes0_node)
            WITH this0
            CREATE (this0_sizes1_node:Size)
            SET this0_sizes1_node.id = $this0_sizes1_node_id
            SET this0_sizes1_node.name = $this0_sizes1_node_name
            MERGE (this0)-[:HAS_SIZE]->(this0_sizes1_node)
            WITH this0
            CREATE (this0_colors0_node:Color)
            SET this0_colors0_node.id = $this0_colors0_node_id
            SET this0_colors0_node.name = $this0_colors0_node_name
            MERGE (this0)-[:HAS_COLOR]->(this0_colors0_node)
            WITH this0
            CREATE (this0_colors1_node:Color)
            SET this0_colors1_node.id = $this0_colors1_node_id
            SET this0_colors1_node.name = $this0_colors1_node_name
            MERGE (this0)-[:HAS_COLOR]->(this0_colors1_node)
            WITH this0
            CREATE (this0_photos0_node:Photo)
            SET this0_photos0_node.id = $this0_photos0_node_id
            SET this0_photos0_node.description = $this0_photos0_node_description
            SET this0_photos0_node.url = $this0_photos0_node_url
            MERGE (this0)-[:HAS_PHOTO]->(this0_photos0_node)
            WITH this0, this0_photos0_node
            CALL {
            	WITH this0_photos0_node
            	MATCH (this0_photos0_node)-[this0_photos0_node_color_Color_unique:OF_COLOR]->(:Color)
            	WITH count(this0_photos0_node_color_Color_unique) as c
            	CALL apoc.util.validate(NOT(c = 1), '@neo4j/graphql/RELATIONSHIP-REQUIREDPhoto.color required', [0])
            	RETURN c AS this0_photos0_node_color_Color_unique_ignored
            }
            WITH this0
            CREATE (this0_photos1_node:Photo)
            SET this0_photos1_node.id = $this0_photos1_node_id
            SET this0_photos1_node.description = $this0_photos1_node_description
            SET this0_photos1_node.url = $this0_photos1_node_url
            WITH this0, this0_photos1_node
            CALL {
            	WITH this0, this0_photos1_node
            	OPTIONAL MATCH (this0_photos1_node_color_connect0_node:Color)
            	WHERE this0_photos1_node_color_connect0_node.id = $this0_photos1_node_color_connect0_node_id
            	FOREACH(_ IN CASE this0_photos1_node WHEN NULL THEN [] ELSE [1] END |
            		FOREACH(_ IN CASE this0_photos1_node_color_connect0_node WHEN NULL THEN [] ELSE [1] END |
            			MERGE (this0_photos1_node)-[:OF_COLOR]->(this0_photos1_node_color_connect0_node)
            		)
            	)
            	RETURN count(*)
            }
            MERGE (this0)-[:HAS_PHOTO]->(this0_photos1_node)
            WITH this0, this0_photos1_node
            CALL {
            	WITH this0_photos1_node
            	MATCH (this0_photos1_node)-[this0_photos1_node_color_Color_unique:OF_COLOR]->(:Color)
            	WITH count(this0_photos1_node_color_Color_unique) as c
            	CALL apoc.util.validate(NOT(c = 1), '@neo4j/graphql/RELATIONSHIP-REQUIREDPhoto.color required', [0])
            	RETURN c AS this0_photos1_node_color_Color_unique_ignored
            }
            WITH this0
            CREATE (this0_photos2_node:Photo)
            SET this0_photos2_node.id = $this0_photos2_node_id
            SET this0_photos2_node.description = $this0_photos2_node_description
            SET this0_photos2_node.url = $this0_photos2_node_url
            WITH this0, this0_photos2_node
            CALL {
            	WITH this0, this0_photos2_node
            	OPTIONAL MATCH (this0_photos2_node_color_connect0_node:Color)
            	WHERE this0_photos2_node_color_connect0_node.id = $this0_photos2_node_color_connect0_node_id
            	FOREACH(_ IN CASE this0_photos2_node WHEN NULL THEN [] ELSE [1] END |
            		FOREACH(_ IN CASE this0_photos2_node_color_connect0_node WHEN NULL THEN [] ELSE [1] END |
            			MERGE (this0_photos2_node)-[:OF_COLOR]->(this0_photos2_node_color_connect0_node)
            		)
            	)
            	RETURN count(*)
            }
            MERGE (this0)-[:HAS_PHOTO]->(this0_photos2_node)
            WITH this0, this0_photos2_node
            CALL {
            	WITH this0_photos2_node
            	MATCH (this0_photos2_node)-[this0_photos2_node_color_Color_unique:OF_COLOR]->(:Color)
            	WITH count(this0_photos2_node_color_Color_unique) as c
            	CALL apoc.util.validate(NOT(c = 1), '@neo4j/graphql/RELATIONSHIP-REQUIREDPhoto.color required', [0])
            	RETURN c AS this0_photos2_node_color_Color_unique_ignored
            }
            RETURN this0
            }
            RETURN
            this0 { .id } AS this0"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this0_id\\": \\"1\\",
                \\"this0_name\\": \\"Pringles\\",
                \\"this0_sizes0_node_id\\": \\"103\\",
                \\"this0_sizes0_node_name\\": \\"Small\\",
                \\"this0_sizes1_node_id\\": \\"104\\",
                \\"this0_sizes1_node_name\\": \\"Large\\",
                \\"this0_colors0_node_id\\": \\"100\\",
                \\"this0_colors0_node_name\\": \\"Red\\",
                \\"this0_colors1_node_id\\": \\"102\\",
                \\"this0_colors1_node_name\\": \\"Green\\",
                \\"this0_photos0_node_id\\": \\"105\\",
                \\"this0_photos0_node_description\\": \\"Outdoor photo\\",
                \\"this0_photos0_node_url\\": \\"outdoor.png\\",
                \\"this0_photos1_node_id\\": \\"106\\",
                \\"this0_photos1_node_description\\": \\"Green photo\\",
                \\"this0_photos1_node_url\\": \\"g.png\\",
                \\"this0_photos1_node_color_connect0_node_id\\": \\"102\\",
                \\"this0_photos2_node_id\\": \\"107\\",
                \\"this0_photos2_node_description\\": \\"Red photo\\",
                \\"this0_photos2_node_url\\": \\"r.png\\",
                \\"this0_photos2_node_color_connect0_node_id\\": \\"100\\"
            }"
        `);
    });

    test("Update Pringles Color", async () => {
        const query = gql`
            mutation {
                updateProducts(
                    where: { name: "Pringles" }
                    update: {
                        photos: [
                            {
                                where: { node: { description: "Green Photo" } }
                                update: {
                                    node: {
                                        description: "Light Green Photo"
                                        color: {
                                            connect: { where: { node: { name: "Light Green" } } }
                                            disconnect: { where: { node: { name: "Green" } } }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                ) {
                    products {
                        id
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Product)
            WHERE this.name = $this_name
            WITH this
            OPTIONAL MATCH (this)-[this_has_photo0_relationship:HAS_PHOTO]->(this_photos0:Photo)
            WHERE this_photos0.description = $updateProducts.args.update.photos[0].where.node.description
            CALL apoc.do.when(this_photos0 IS NOT NULL, \\"
            SET this_photos0.description = $this_update_photos0_description
            WITH this, this_photos0
            CALL {
            WITH this, this_photos0
            OPTIONAL MATCH (this_photos0)-[this_photos0_color0_disconnect0_rel:OF_COLOR]->(this_photos0_color0_disconnect0:Color)
            WHERE this_photos0_color0_disconnect0.name = $updateProducts.args.update.photos[0].update.node.color.disconnect.where.node.name
            FOREACH(_ IN CASE this_photos0_color0_disconnect0 WHEN NULL THEN [] ELSE [1] END |
            DELETE this_photos0_color0_disconnect0_rel
            )
            RETURN count(*)
            }
            WITH this, this_photos0
            CALL {
            	WITH this, this_photos0
            	OPTIONAL MATCH (this_photos0_color0_connect0_node:Color)
            	WHERE this_photos0_color0_connect0_node.name = $this_photos0_color0_connect0_node_name
            	FOREACH(_ IN CASE this_photos0 WHEN NULL THEN [] ELSE [1] END |
            		FOREACH(_ IN CASE this_photos0_color0_connect0_node WHEN NULL THEN [] ELSE [1] END |
            			MERGE (this_photos0)-[:OF_COLOR]->(this_photos0_color0_connect0_node)
            		)
            	)
            	RETURN count(*)
            }
            WITH this, this_photos0
            CALL {
            	WITH this_photos0
            	MATCH (this_photos0)-[this_photos0_color_Color_unique:OF_COLOR]->(:Color)
            	WITH count(this_photos0_color_Color_unique) as c
            	CALL apoc.util.validate(NOT(c = 1), '@neo4j/graphql/RELATIONSHIP-REQUIREDPhoto.color required', [0])
            	RETURN c AS this_photos0_color_Color_unique_ignored
            }
            RETURN count(*)
            \\", \\"\\", {this:this, updateProducts: $updateProducts, this_photos0:this_photos0, auth:$auth,this_update_photos0_description:$this_update_photos0_description,this_photos0_color0_connect0_node_name:$this_photos0_color0_connect0_node_name})
            YIELD value as _
            RETURN this { .id } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this_name\\": \\"Pringles\\",
                \\"this_update_photos0_description\\": \\"Light Green Photo\\",
                \\"this_photos0_color0_connect0_node_name\\": \\"Light Green\\",
                \\"auth\\": {
                    \\"isAuthenticated\\": true,
                    \\"roles\\": [],
                    \\"jwt\\": {
                        \\"roles\\": []
                    }
                },
                \\"updateProducts\\": {
                    \\"args\\": {
                        \\"update\\": {
                            \\"photos\\": [
                                {
                                    \\"where\\": {
                                        \\"node\\": {
                                            \\"description\\": \\"Green Photo\\"
                                        }
                                    },
                                    \\"update\\": {
                                        \\"node\\": {
                                            \\"description\\": \\"Light Green Photo\\",
                                            \\"color\\": {
                                                \\"connect\\": {
                                                    \\"where\\": {
                                                        \\"node\\": {
                                                            \\"name\\": \\"Light Green\\"
                                                        }
                                                    }
                                                },
                                                \\"disconnect\\": {
                                                    \\"where\\": {
                                                        \\"node\\": {
                                                            \\"name\\": \\"Green\\"
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            }"
        `);
    });
});
